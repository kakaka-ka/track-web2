import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireSuperAdmin } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const authResult = await requireSuperAdmin(request);
  if ("denied" in authResult) return authResult.denied;

  const users = await prisma.adminUser.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      groupId: true,
      group: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const authResult = await requireSuperAdmin(request);
  if ("denied" in authResult) return authResult.denied;

  const { username, password, role, groupId } = await request.json();
  if (!username || !password) {
    return NextResponse.json({ error: "username and password required" }, { status: 400 });
  }
  const allowedRoles = ["admin", "super_admin"];
  const safeRole = allowedRoles.includes(role) ? role : "admin";

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await prisma.adminUser.create({
      data: {
        username,
        passwordHash,
        role: safeRole,
        groupId: groupId ? Number(groupId) : null,
      },
      select: {
        id: true,
        username: true,
        role: true,
        groupId: true,
        group: { select: { id: true, name: true } },
        createdAt: true,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }
}
