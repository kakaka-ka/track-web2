import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { time, location, description } = await req.json();

  if (!time || !description) {
    return NextResponse.json({ error: "time and description required" }, { status: 400 });
  }

  const event = await prisma.trackingEvent.create({
    data: {
      packageId: Number(id),
      time: new Date(time),
      location: location ?? null,
      description,
    },
  });
  return NextResponse.json(event, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { events, status } = await req.json();

  await prisma.$transaction(async (tx) => {
    await tx.trackingEvent.deleteMany({ where: { packageId: Number(id) } });
    if (events?.length) {
      await tx.trackingEvent.createMany({
        data: events.map((e: { time: string; location?: string; description: string }) => ({
          packageId: Number(id),
          time: new Date(e.time),
          location: e.location ?? null,
          description: e.description,
        })),
      });
    }
    if (status) {
      await tx.package.update({
        where: { id: Number(id) },
        data: { status, lastSyncAt: new Date() },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
