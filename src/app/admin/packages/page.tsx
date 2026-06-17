"use client";

import { useEffect, useState, useCallback } from "react";
import AdminNav from "@/components/AdminNav";

interface Carrier {
  id: number;
  name: string;
  code: string;
}

interface Package {
  id: number;
  trackingNumber: string;
  status: string;
  orderId: string | null;
  buyerName: string | null;
  note: string | null;
  createdAt: string;
  carrier: Carrier;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "待处理",
  info_received: "已收到信息",
  in_transit: "运输中",
  out_for_delivery: "派送中",
  delivery_failed: "派送失败",
  delivered: "已签收",
  expired: "已过期",
  exception: "异常",
  unknown: "未知",
  no_api_key: "未配置",
};

const STATUS_BADGE: Record<string, string> = {
  delivered: "bg-green-100 text-green-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  in_transit: "bg-yellow-100 text-yellow-700",
  delivery_failed: "bg-red-100 text-red-700",
  exception: "bg-red-100 text-red-700",
  pending: "bg-gray-100 text-gray-600",
};

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    trackingNumber: "",
    carrierId: "",
    orderId: "",
    buyerName: "",
    note: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
    });
    const res = await fetch(`/api/admin/packages?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPackages(data.packages);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    fetch("/api/admin/carriers").then((r) => r.json()).then(setCarriers);
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("确认删除该包裹？")) return;
    await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
    fetchPackages();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    const res = await fetch("/api/admin/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setAddLoading(false);
    if (res.ok) {
      setShowAdd(false);
      setAddForm({ trackingNumber: "", carrierId: "", orderId: "", buyerName: "", note: "" });
      fetchPackages();
    } else {
      const data = await res.json();
      setAddError(data.error ?? "操作失败");
    }
  }

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 bg-gray-50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">包裹管理</h1>
            <p className="text-sm text-gray-500">共 {total} 个包裹</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + 添加包裹
          </button>
        </div>

        {/* 筛选栏 */}
        <div className="flex gap-3 mb-5">
          <input
            type="text"
            placeholder="搜索运单号、订单号、买家姓名..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* 表格 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">加载中...</div>
          ) : packages.length === 0 ? (
            <div className="p-8 text-center text-gray-400">暂无包裹数据</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">运单号</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">承运商</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">订单号</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">买家</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">添加日期</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/admin/packages/${pkg.id}`}>
                    <td className="px-4 py-3 font-mono text-xs text-blue-700 hover:underline">{pkg.trackingNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{pkg.carrier.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[pkg.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[pkg.status] ?? pkg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{pkg.orderId ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{pkg.buyerName ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(pkg.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(pkg.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              上一页
            </button>
            <span className="text-sm text-gray-600">第 {page} / {totalPages} 页</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        )}

        {/* 添加弹窗 */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">添加包裹</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">运单号 *</label>
                  <input
                    required
                    value={addForm.trackingNumber}
                    onChange={(e) => setAddForm({ ...addForm, trackingNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">承运商 *</label>
                  <select
                    required
                    value={addForm.carrierId}
                    onChange={(e) => setAddForm({ ...addForm, carrierId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择...</option>
                    {carriers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">订单号</label>
                  <input
                    value={addForm.orderId}
                    onChange={(e) => setAddForm({ ...addForm, orderId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">买家姓名</label>
                  <input
                    value={addForm.buyerName}
                    onChange={(e) => setAddForm({ ...addForm, buyerName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <input
                    value={addForm.note}
                    onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {addError && <p className="text-red-600 text-sm">{addError}</p>}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
                  >
                    {addLoading ? "提交中..." : "添加"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
