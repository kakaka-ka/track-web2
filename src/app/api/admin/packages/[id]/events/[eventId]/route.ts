import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { eventId } = await params;
  const { time, location, description } = await req.json();

  const event = await prisma.trackingEvent.update({
    where: { id: Number(eventId) },
    data: {
      ...(time && { time: new Date(time) }),
      ...(description && { description }),
      location: location ?? null,
    },
  });
  return NextResponse.json(event);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { eventId } = await params;
  await prisma.trackingEvent.delete({ where: { id: Number(eventId) } });
  return NextResponse.json({ ok: true });
}
