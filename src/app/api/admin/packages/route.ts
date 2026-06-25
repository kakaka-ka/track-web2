import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext, groupFilter } from "@/lib/adminAuth";
import { buildTrajectory, deriveStatusFromEvents, seedFromString } from "@/lib/trajectory";

async function findOrCreateCarrierByName(name: string): Promise<number> {
  const carrierName = name.trim() || "Unknown";
  const existing = await prisma.carrier.findFirst({ where: { name: carrierName } });
  if (existing) return existing.id;
  const code = carrierName.toLowerCase().replace(/\s+/g, "_").slice(0, 20) || "carrier";
  try {
    const created = await prisma.carrier.create({ data: { name: carrierName, code } });
    return created.id;
  } catch {
    const byCode = await prisma.carrier.findFirst({ where: { code } });
    if (byCode) return byCode.id;
    throw new Error(`无法创建承运商: ${carrierName}`);
  }
}

export async function GET(request: NextRequest) {
  const authResult = await getAdminContext(request);
  if ("denied" in authResult) return authResult.denied;
  const { context } = authResult;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = 20;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const where = {
    ...groupFilter(context),
    ...(search && {
      OR: [
        { trackingNumber: { contains: search } },
        { orderId: { contains: search } },
        { buyerName: { contains: search } },
      ],
    }),
    ...(status && { status }),
  };

  const now = new Date();

  const [total, packages] = await Promise.all([
    prisma.package.count({ where }),
    prisma.package.findMany({
      where,
      include: {
        carrier: true,
        events: {
          where: { time: { lte: now } },
          orderBy: { time: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const packagesWithStatus = packages.map((pkg) => {
    if (pkg.status === "delivered") return { ...pkg, events: undefined };
    let effectiveStatus = "pending";
    if (pkg.events.length > 0) {
      const d = pkg.events[0].description.toLowerCase();
      if (d.includes("livré") || d.includes("remis") || d.includes("signé")) effectiveStatus = "delivered";
      else if (d.includes("en livraison") || (d.includes("distribution") && d.includes("mettre"))) effectiveStatus = "out_for_delivery";
      else if (d.includes("transit") || d.includes("traitement") || d.includes("tri local")) effectiveStatus = "in_transit";
      else if (d.includes("confié") || d.includes("préparation") || d.includes("pris en charge")) effectiveStatus = "info_received";
      else effectiveStatus = "in_transit";
    }
    return { ...pkg, status: effectiveStatus, events: undefined };
  });

  return NextResponse.json({ packages: packagesWithStatus, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const authResult = await getAdminContext(request);
  if ("denied" in authResult) return authResult.denied;
  const { context } = authResult;

  const body = await request.json();
  const {
    trackingNumber, carrierId, carrierName, orderId, buyerName, note,
    shippedAt, estimatedDelivery,
  } = body;

  if (!trackingNumber) {
    return NextResponse.json({ error: "trackingNumber required" }, { status: 400 });
  }

  let resolvedCarrierId: number;
  try {
    if (carrierId) {
      resolvedCarrierId = Number(carrierId);
    } else if (carrierName && String(carrierName).trim()) {
      resolvedCarrierId = await findOrCreateCarrierByName(String(carrierName));
    } else {
      return NextResponse.json({ error: "carrierId or carrierName required" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "carrier resolve failed" },
      { status: 400 }
    );
  }

  // 确定 groupId：super_admin 可指定；admin 只能用自己的组
  let packageGroupId: number | null = null;
  if (context.role === "super_admin") {
    packageGroupId = body.groupId ? Number(body.groupId) : null;
  } else {
    packageGroupId = context.groupId;
  }

  const data = {
    carrierId: resolvedCarrierId,
    orderId: orderId ?? undefined,
    buyerName: buyerName ?? undefined,
    note: note ?? undefined,
    shippedAt: shippedAt ? new Date(shippedAt) : null,
    estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
    groupId: packageGroupId,
  };

  const pkg = await prisma.package.upsert({
    where: { trackingNumber },
    update: data,
    create: { trackingNumber, ...data },
    include: { carrier: true },
  });

  // ── 自动生成轨迹(ERP 自发单号用)──────────────────────────────────────────
  // autoTrajectory:true + estimatedDelivery 时,按模板服务端生成整条轨迹。
  // 自发单号(如 La Poste 6G...)17track 查不到,只能靠模板模拟。
  let trajectoryNote: string | undefined;
  if (body.autoTrajectory && data.estimatedDelivery) {
    try {
      const shipped = data.shippedAt ?? new Date();
      const delivery = data.estimatedDelivery;
      // 找模板:① 指定 templateId ② 同承运商的模板 ③ 承运商名模糊匹配的模板
      let template = null;
      if (body.templateId) {
        template = await prisma.template.findUnique({
          where: { id: Number(body.templateId) },
          include: { events: true },
        });
      }
      if (!template) {
        template = await prisma.template.findFirst({
          where: { carrierId: resolvedCarrierId },
          include: { events: true },
          orderBy: { id: "asc" },
        });
      }
      if (!template && carrierName) {
        template = await prisma.template.findFirst({
          where: { carrier: { name: { contains: String(carrierName), mode: "insensitive" } } },
          include: { events: true },
          orderBy: { id: "asc" },
        });
      }

      if (template && template.events.length > 0 && delivery > shipped) {
        const seed = seedFromString(trackingNumber);
        const evs = buildTrajectory(template.events, shipped, delivery, seed);
        const status = deriveStatusFromEvents(evs, new Date());
        await prisma.$transaction(async (tx) => {
          await tx.trackingEvent.deleteMany({ where: { packageId: pkg.id } });
          await tx.trackingEvent.createMany({
            data: evs.map((e) => ({
              packageId: pkg.id,
              time: e.time,
              location: e.location,
              description: e.description,
            })),
          });
          await tx.package.update({
            where: { id: pkg.id },
            data: { status, lastSyncAt: new Date() },
          });
        });
        trajectoryNote = `已生成 ${evs.length} 条轨迹(模板「${template.name}」)`;
      } else if (!template) {
        trajectoryNote = `未找到承运商「${carrierName ?? resolvedCarrierId}」对应的轨迹模板,只建了包裹`;
      } else if (template.events.length === 0) {
        trajectoryNote = `模板「${template.name}」没有事件,只建了包裹`;
      } else {
        trajectoryNote = "到达日期需晚于发货日期,未生成轨迹";
      }
    } catch (e) {
      trajectoryNote = "轨迹生成失败:" + (e instanceof Error ? e.message : String(e));
    }
  }

  return NextResponse.json({ ...pkg, trajectoryNote }, { status: 201 });
}
