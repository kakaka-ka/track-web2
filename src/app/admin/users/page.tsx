"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";

interface AdminUser {
  id: number;
  username: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add form
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("admin");
  const [adding, setAdding] = useState(false);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    else setError("Accès refusé ou erreur serveur");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: addUsername, password: addPassword, role: addRole }),
    });
    if (res.ok) {
      setAddUsername(""); setAddPassword(""); setAddRole("admin");
      await load();
    } else {
      const d = await res.json();
      alert(d.error ?? "Erreur");
    }
    setAdding(false);
  }

  async function handleDelete(user: AdminUser) {
    if (!confirm(`Supprimer l'utilisateur "${user.username}" ?`)) return;
    await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    await load();
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setSaving(true);
    const res = await fetch(`/api/admin/users/${resetTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (res.ok) {
      setResetTarget(null);
      setNewPassword("");
    } else {
      alert("Erreur lors de la mise à jour");
    }
    setSaving(false);
  }

  async function handleToggleRole(user: AdminUser) {
    const newRole = user.role === "super_admin" ? "admin" : "super_admin";
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    await load();
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">用户管理</h1>
        <p className="text-gray-500 mb-8 text-sm">管理后台管理员账号</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* User list */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">现有账号</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">加载中...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-gray-500 font-medium">用户名</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">角色</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">创建时间</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono font-medium text-gray-900">{u.username}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "super_admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-50 text-blue-700"
                      }`}>
                        {u.role === "super_admin" ? "超级管理员" : "管理员"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setResetTarget(u); setNewPassword(""); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          改密码
                        </button>
                        <button
                          onClick={() => handleToggleRole(u)}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          {u.role === "super_admin" ? "降为管理员" : "升为超级管理员"}
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400">暂无账号</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Add user */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">添加账号</h2>
          </div>
          <form onSubmit={handleAdd} className="p-5 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">用户名</label>
              <input
                required
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
                placeholder="alice"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">密码</label>
              <input
                required
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">角色</label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="admin">管理员</option>
                <option value="super_admin">超级管理员</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {adding ? "添加中..." : "添加"}
            </button>
          </form>
        </div>
      </main>

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="font-semibold text-gray-900 mb-1">修改密码</h3>
            <p className="text-sm text-gray-500 mb-4">用户：<span className="font-mono">{resetTarget.username}</span></p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新密码"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
