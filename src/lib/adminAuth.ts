import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export interface AdminContext {
  role: string;
  groupId: number | null;
  isApiKey: boolean;
}

/**
 * 从请求中提取管理员身份信息。
 * API Key 请求视为 super_admin（无 groupId 限制）。
 * session 请求按实际 role/groupId 返回。
 */
export async function getAdminContext(
  request: NextRequest
): Promise<{ context: AdminContext } | { denied: NextResponse }> {
  // 1. ERP API Key
  const expectedKey = process.env.ERP_API_KEY;
  if (expectedKey) {
    const provided = request.headers.get("x-api-key");
    if (provided === expectedKey) {
      return { context: { role: "super_admin", groupId: null, isApiKey: true } };
    }
  }

  // 2. Session
  try {
    const session = await auth();
    if (session?.user) {
      const u = session.user as { role?: string; groupId?: number | null };
      if (u.role) {
        return {
          context: {
            role: u.role,
            groupId: u.groupId ?? null,
            isApiKey: false,
          },
        };
      }
    }
  } catch {
    // ignore
  }

  return { denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

export async function requireSuperAdmin(
  request: NextRequest
): Promise<{ context: AdminContext } | { denied: NextResponse }> {
  const result = await getAdminContext(request);
  if ("denied" in result) return result;
  if (result.context.role !== "super_admin") {
    return { denied: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}

/** groupId 过滤条件：super_admin 不限制，admin 只能看自己组 */
export function groupFilter(context: AdminContext): { groupId?: number | null } {
  if (context.role === "super_admin") return {};
  return { groupId: context.groupId };
}
