import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext, groupFilter } from "@/lib/adminAuth";

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

  return NextResponse.json(pkg, { status: 201 });
}
