import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/adminAuth";

async function getContextAndVerifyAccess(
  request: NextRequest,
  packageId: number
): Promise<{ denied: NextResponse } | { pkg: Awaited<ReturnType<typeof prisma.package.findUnique>> }> {
  const authResult = await getAdminContext(request);
  if ("denied" in authResult) return { denied: authResult.denied };
  const { context } = authResult;

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    include: { carrier: true, events: { orderBy: { time: "desc" } } },
  });
  if (!pkg) return { denied: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  if (context.role !== "super_admin" && pkg.groupId !== context.groupId) {
    return { denied: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { pkg };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getContextAndVerifyAccess(request, Number(id));
  if ("denied" in result) return result.denied;
  return NextResponse.json(result.pkg);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const packageId = Number(id);

  const accessResult = await getContextAndVerifyAccess(req, packageId);
  if ("denied" in accessResult) return accessResult.denied;

  const body = await req.json();
  const { status, statusDetail, note, buyerName, orderId, shippedAt, estimatedDelivery } = body;
  const now = new Date();

  const pkg = await prisma.package.update({
    where: { id: packageId },
    data: {
      status,
      statusDetail,
      note,
      buyerName,
      orderId,
      shippedAt: shippedAt ? new Date(shippedAt) : undefined,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
    },
    include: { carrier: true, events: { orderBy: { time: "asc" } } },
  });

  if (estimatedDelivery && pkg.events.length > 0) {
    const newDelivery = new Date(estimatedDelivery);
    const pastEvents = pkg.events.filter((e) => e.time <= now);
    const futureEvents = pkg.events.filter((e) => e.time > now);

    if (futureEvents.length > 0 && pastEvents.length > 0) {
      const lastPastTime = pastEvents[pastEvents.length - 1].time.getTime();
      const totalFutureSpan = newDelivery.getTime() - lastPastTime;
      const step = totalFutureSpan / (futureEvents.length + 1);

      await prisma.$transaction(
        futureEvents.map((e, i) =>
          prisma.trackingEvent.update({
            where: { id: e.id },
            data: { time: new Date(lastPastTime + step * (i + 1)) },
          })
        )
      );
    }
  }

  return NextResponse.json(pkg);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getContextAndVerifyAccess(req, Number(id));
  if ("denied" in result) return result.denied;
  await prisma.package.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
