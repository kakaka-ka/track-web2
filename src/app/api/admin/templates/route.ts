import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.template.findMany({
    include: {
      carrier: true,
      events: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const { name, carrierId, description, events } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const template = await prisma.template.create({
    data: {
      name,
      carrierId: carrierId ? Number(carrierId) : null,
      description,
      events: events?.length
        ? {
            create: events.map(
              (e: { description: string; location?: string; offsetHours: number }, i: number) => ({
                sortOrder: i,
                description: e.description,
                location: e.location ?? null,
                offsetHours: Number(e.offsetHours ?? 0),
              })
            ),
          }
        : undefined,
    },
    include: { carrier: true, events: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(template, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await prisma.template.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
