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

export async function GET() {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await prisma.adminUser.findMany({
    select: { id: true, username: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { username, password, role } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "username and password required" }, { status: 400 });
  }
  const allowedRoles = ["admin", "super_admin"];
  const safeRole = allowedRoles.includes(role) ? role : "admin";

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await prisma.adminUser.create({
      data: { username, passwordHash, role: safeRole },
      select: { id: true, username: true, role: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }
}
