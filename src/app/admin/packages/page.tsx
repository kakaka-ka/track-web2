"use client";

import { useEffect, useState, useCallback } from "react";
import AdminNav from "@/components/AdminNav";

interface Carrier { id: number; name: string; code: string; }
interface Template { id: number; name: string; events: { description: string; location?: string; offsetHours: number }[]; }
interface Package {
  id: number; trackingNumber: string; status: string;
  orderId: string | null; buyerName: string | null; note: string | null;
  createdAt: string; carrier: Carrier;
  shippedAt: string | null; estimatedDelivery: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "待处理", info_received: "已收到信息", in_transit: "运输中",
  out_for_delivery: "派送中", delivery_failed: "派送失败", delivered: "已签收",
  expired: "已过期", exception: "异常", unknown: "未知", no_api_key: "未配置",
};

const STATUS_BADGE: Record<string, string> = {
  delivered: "bg-green-100 text-green-700", out_for_delivery: "bg-blue-100 text-blue-700",
  in_transit: "bg-yellow-100 text-yellow-700", delivery_failed: "bg-red-100 text-red-700",
  exception: "bg-red-100 text-red-700", pending: "bg-gray-100 text-gray-600",
};

// Paris timezone offset helper
function toParisInputValue(date: Date): string {
  const paris = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const g = (t: string) => paris.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

// Convert Paris local datetime-local input value to UTC ISO string
function parisInputToUTC(value: string): string {
  // value is like "2026-06-18T14:30" in Paris time
  // We create a date assuming it's Paris time
  const d = new Date(value + ":00");
  // Adjust for Paris offset — use Intl to detect Paris UTC offset
  const utcMs = d.getTime();
  const parisMs = new Date(new Date(value).toLocaleString("en-US", { timeZone: "Europe/Paris" })).getTime();
  const localMs = new Date(value).getTime();
  const parisOffset = localMs - parisMs;
  return new Date(utcMs + parisOffset).toISOString();
}

// Stage intervals in hours: [min, max]
const STAGE_INTERVALS = [
  { name: "发货→收件", min: 4, max: 12 },
  { name: "收件→运输", min: 6, max: 24 },
  { name: "运输→派送", min: 12, max: 48 },
  { name: "派送→签收", min: 2, max: 8 },
];

function seededRand(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function generateTimestamps(
  shippedAt: Date, deliveryAt: Date, eventCount: number, seed: number
): Date[] {
  const rand = seededRand(seed);
  const totalMs = deliveryAt.getTime() - shippedAt.getTime();
  if (totalMs <= 0 || eventCount <= 0) return [];

  // Generate random proportions that sum to 1
  const props: number[] = [];
  for (let i = 0; i < eventCount; i++) props.push(rand() + 0.1);
  const sum = props.reduce((a, b) => a + b, 0);
  const normalized = props.map((p) => p / sum);

  const times: Date[] = [];
  let cursor = shippedAt.getTime();
  for (let i = 0; i < eventCount - 1; i++) {
    cursor += normalized[i] * totalMs;
    times.push(new Date(cursor));
  }
  times.push(deliveryAt); // last event = delivery
  return times;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    trackingNumber: "", carrierId: "", orderId: "", buyerName: "", note: "",
    shippedAt: toParisInputValue(new Date()),
    estimatedDelivery: toParisInputValue(new Date(Date.now() + 3 * 24 * 3600 * 1000)),
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Auto-generate state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [generatedEvents, setGeneratedEvents] = useState<{ time: Date; description: string; location: string }[]>([]);
  const [seed, setSeed] = useState(Math.floor(Math.random() * 99999));
  const [showPreview, setShowPreview] = useState(false);

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

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  useEffect(() => {
    fetch("/api/admin/carriers").then((r) => r.json()).then(setCarriers);
    fetch("/api/admin/templates").then((r) => r.json()).then(setTemplates);
  }, []);

  function generatePreview(currentSeed: number) {
    if (!selectedTemplate || !addForm.shippedAt || !addForm.estimatedDelivery) return;
    const shipped = new Date(addForm.shippedAt);
    const delivery = new Date(addForm.estimatedDelivery);
    if (delivery <= shipped) return;
    const events = selectedTemplate.events;
    const times = generateTimestamps(shipped, delivery, events.length, currentSeed);
    setGeneratedEvents(events.map((e, i) => ({
      time: times[i] ?? delivery,
      description: e.description,
      location: e.location ?? "",
    })));
    setShowPreview(true);
  }

  function handleRegenerate() {
    const newSeed = Math.floor(Math.random() * 99999);
    setSeed(newSeed);
    generatePreview(newSeed);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");

    // Create package first
    const res = await fetch("/api/admin/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...addForm,
        shippedAt: addForm.shippedAt ? new Date(addForm.shippedAt).toISOString() : null,
        estimatedDelivery: addForm.estimatedDelivery ? new Date(addForm.estimatedDelivery).toISOString() : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setAddError(data.error ?? "操作失败");
      setAddLoading(false);
      return;
    }

    const pkg = await res.json();

    // If we have generated events, save them
    if (generatedEvents.length > 0 && showPreview) {
      const lastEvent = generatedEvents[generatedEvents.length - 1];
      const desc = lastEvent.description.toLowerCase();
      let status = "in_transit";
      if (desc.includes("livré") || desc.includes("remis")) status = "delivered";
      else if (desc.includes("livraison") || desc.includes("distribution")) status = "out_for_delivery";
      else if (desc.includes("transit") || desc.includes("traitement")) status = "in_transit";
      else if (desc.includes("confié") || desc.includes("préparation")) status = "info_received";

      await fetch(`/api/admin/packages/${pkg.id}/events`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: generatedEvents.map((ev) => ({
            time: ev.time.toISOString(),
            location: ev.location,
            description: ev.description,
          })),
          status,
        }),
      });
    }

    setAddLoading(false);
    setShowAdd(false);
    setAddForm({
      trackingNumber: "", carrierId: "", orderId: "", buyerName: "", note: "",
      shippedAt: toParisInputValue(new Date()),
      estimatedDelivery: toParisInputValue(new Date(Date.now() + 3 * 24 * 3600 * 1000)),
    });
    setSelectedTemplate(null);
    setGeneratedEvents([]);
    setShowPreview(false);
    fetchPackages();
  }

  async function handleDelete(id: number) {
    if (!confirm("确认删除该包裹？")) return;
    await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
    fetchPackages();
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
          <button onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + 添加包裹
          </button>
        </div>

        {/* 筛选栏 */}
        <div className="flex gap-3 mb-5">
          <input type="text" placeholder="搜索运单号、订单号、买家姓名..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
                  <tr key={pkg.id} className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => window.location.href = `/admin/packages/${pkg.id}`}>
                    <td className="px-4 py-3 font-mono text-xs text-blue-700 hover:underline">{pkg.trackingNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{pkg.carrier.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[pkg.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[pkg.status] ?? pkg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{pkg.orderId ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{pkg.buyerName ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(pkg.createdAt).toLocaleDateString("zh-CN")}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDelete(pkg.id)} className="text-red-400 hover:text-red-600 text-xs">删除</button>
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
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">上一页</button>
            <span className="text-sm text-gray-600">第 {page} / {totalPages} 页</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">下一页</button>
          </div>
        )}

        {/* 添加弹窗 */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">添加包裹</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">运单号 *</label>
                    <input required value={addForm.trackingNumber}
                      onChange={(e) => setAddForm({ ...addForm, trackingNumber: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">承运商 *</label>
                    <select required value={addForm.carrierId}
                      onChange={(e) => setAddForm({ ...addForm, carrierId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">请选择...</option>
                      {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">发货时间（巴黎时间）*</label>
                    <input type="datetime-local" required value={addForm.shippedAt}
                      onChange={(e) => setAddForm({ ...addForm, shippedAt: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预计送达（巴黎时间）*</label>
                    <input type="datetime-local" required value={addForm.estimatedDelivery}
                      onChange={(e) => setAddForm({ ...addForm, estimatedDelivery: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">订单号</label>
                    <input value={addForm.orderId} onChange={(e) => setAddForm({ ...addForm, orderId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">买家姓名</label>
                    <input value={addForm.buyerName} onChange={(e) => setAddForm({ ...addForm, buyerName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <input value={addForm.note} onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* 智能生成轨迹 */}
                <div className="border border-blue-100 rounded-lg p-3 bg-blue-50">
                  <p className="text-xs font-medium text-blue-800 mb-2">智能生成物流轨迹（可选）</p>
                  <select value={selectedTemplate?.id ?? ""}
                    onChange={(e) => {
                      const t = templates.find((t) => t.id === Number(e.target.value)) ?? null;
                      setSelectedTemplate(t);
                      setShowPreview(false);
                      setGeneratedEvents([]);
                    }}
                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2">
                    <option value="">不使用模板自动生成</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {selectedTemplate && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => generatePreview(seed)}
                        className="flex-1 bg-blue-600 text-white rounded-lg py-1.5 text-xs font-medium hover:bg-blue-700">
                        预览生成轨迹
                      </button>
                      {showPreview && (
                        <button type="button" onClick={handleRegenerate}
                          className="flex-1 border border-blue-300 text-blue-700 rounded-lg py-1.5 text-xs hover:bg-blue-100">
                          重新随机
                        </button>
                      )}
                    </div>
                  )}

                  {/* Preview */}
                  {showPreview && generatedEvents.length > 0 && (
                    <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                      {generatedEvents.map((ev, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <span className="text-blue-400 w-32 flex-shrink-0">
                            {ev.time.toLocaleString("fr-FR", { timeZone: "Europe/Paris", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-gray-700 truncate">{ev.description}</span>
                        </div>
                      ))}
                      <p className="text-xs text-green-600 font-medium mt-1">✓ 确认添加后将自动保存以上轨迹</p>
                    </div>
                  )}
                </div>

                {addError && <p className="text-red-600 text-sm">{addError}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowAdd(false); setShowPreview(false); setGeneratedEvents([]); setSelectedTemplate(null); }}
                    className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">取消</button>
                  <button type="submit" disabled={addLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
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
