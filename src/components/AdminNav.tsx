"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "控制台", exact: true },
  { href: "/admin/packages", label: "包裹管理" },
  { href: "/admin/import", label: "导入文件" },
  { href: "/admin/carriers", label: "承运商" },
  { href: "/admin/templates", label: "模板" },
  { href: "/admin/delivery-proof", label: "交货证明" },
];

export default function AdminNav() {
  const path = usePathname();
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isSuperAdmin = role === "super_admin";

  return (
    <aside className="w-56 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">G</span>
          </div>
          <span className="font-bold text-gray-900">goooootrack</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">后台管理</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active = item.exact ? path === item.href : path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        {isSuperAdmin && (
          <Link
            href="/admin/users"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              path.startsWith("/admin/users")
                ? "bg-purple-50 text-purple-700 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            用户管理
          </Link>
        )}
      </nav>

      <div className="p-3 border-t border-gray-100">
        {session?.user?.name && (
          <div className="px-3 py-1.5 mb-1 text-xs text-gray-400 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium text-[10px]">
              {session.user.name[0].toUpperCase()}
            </div>
            <span>{session.user.name}</span>
            {isSuperAdmin && <span className="text-purple-400">· 超级</span>}
          </div>
        )}
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 mb-1"
        >
          ← 查看前台
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}
