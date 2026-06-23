import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireSuperAdmin } from "@/lib/adminAuth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireSuperAdmin(req);
  if ("denied" in authResult) return authResult.denied;

  const { id } = await params;
  const { password, role, groupId } = await req.json();

  const data: Record<string, unknown> = {};
  if (password) data.passwordHash = await bcrypt.hash(password, 12);
  if (role && ["admin", "super_admin"].includes(role)) data.role = role;
  if (groupId !== undefined) data.groupId = groupId ? Number(groupId) : null;

  const user = await prisma.adminUser.update({
    where: { id: Number(id) },
    data,
    select: {
      id: true,
      username: true,
      role: true,
      groupId: true,
      group: { select: { id: true, name: true } },
      createdAt: true,
    },
  });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireSuperAdmin(_req);
  if ("denied" in authResult) return authResult.denied;

  const { id } = await params;
  await prisma.adminUser.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
