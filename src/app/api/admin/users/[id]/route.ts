import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session) return null;
  if ((session.user as { role?: string }).role !== "super_admin") return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { password, role } = await req.json();

  const data: Record<string, string> = {};
  if (password) data.passwordHash = await bcrypt.hash(password, 12);
  if (role && ["admin", "super_admin"].includes(role)) data.role = role;

  const user = await prisma.adminUser.update({
    where: { id: Number(id) },
    data,
    select: { id: true, username: true, role: true, createdAt: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.adminUser.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
