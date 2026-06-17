import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pkg = await prisma.package.findUnique({
    where: { id: Number(id) },
    include: {
      carrier: true,
      events: { orderBy: { time: "desc" } },
    },
  });

  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pkg);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status, statusDetail, note, buyerName, orderId, shippedAt, estimatedDelivery } = body;

  const now = new Date();

  const pkg = await prisma.package.update({
    where: { id: Number(id) },
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

  // If estimatedDelivery changed, recalculate future events
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.package.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
