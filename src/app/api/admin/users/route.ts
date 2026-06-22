import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function requireSuperAdmin() {
  const session = await auth();
  console.log("[users API] session:", JSON.stringify(session));
  if (!session) { console.log("[users API] no session"); return null; }
  const role = (session.user as { role?: string })?.role;
  console.log("[users API] role:", role, "isSuperAdmin:", role === "super_admin");
  if (role !== "super_admin") return null;
  return session;
}

export async function GET() {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const users = await prisma.adminUser.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(users);
  } catch (e) {
    console.error("[users API] findMany error:", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
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
