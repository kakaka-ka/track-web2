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
  const { status, statusDetail, note, buyerName, orderId } = body;

  const pkg = await prisma.package.update({
    where: { id: Number(id) },
    data: { status, statusDetail, note, buyerName, orderId },
    include: { carrier: true },
  });
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
