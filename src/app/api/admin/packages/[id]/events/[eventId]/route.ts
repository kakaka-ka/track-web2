import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { eventId } = await params;
  await prisma.trackingEvent.delete({ where: { id: Number(eventId) } });
  return NextResponse.json({ ok: true });
}
