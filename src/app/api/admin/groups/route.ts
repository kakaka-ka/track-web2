import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const authResult = await requireSuperAdmin(request);
  if ("denied" in authResult) return authResult.denied;

  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { users: true, packages: true } },
    },
  });

  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  const authResult = await requireSuperAdmin(request);
  if ("denied" in authResult) return authResult.denied;

  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "组名不能为空" }, { status: 400 });
  }

  try {
    const group = await prisma.group.create({
      data: { name: name.trim() },
    });
    return NextResponse.json(group, { status: 201 });
  } catch {
    return NextResponse.json({ error: "组名已存在" }, { status: 409 });
  }
}
