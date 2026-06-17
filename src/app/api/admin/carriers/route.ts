import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const carriers = await prisma.carrier.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(carriers);
}

export async function POST(request: NextRequest) {
  const { name, code } = await request.json();
  if (!name || !code) {
    return NextResponse.json({ error: "name and code required" }, { status: 400 });
  }

  const carrier = await prisma.carrier.create({ data: { name, code } });
  return NextResponse.json(carrier, { status: 201 });
}
