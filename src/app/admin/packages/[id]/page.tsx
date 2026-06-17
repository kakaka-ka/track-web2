"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "pending", label: "待处理" },
  { value: "info_received", label: "已收到信息" },
  { value: "in_transit", label: "运输中" },
  { value: "out_for_delivery", label: "派送中" },
  { value: "delivery_failed", label: "派送失败" },
  { value: "delivered", label: "已签收" },
  { value: "exception", label: "异常" },
  { value: "expired", label: "已过期" },
];

const STATUS_BADGE: Record<string, string> = {
  delivered: "bg-green-100 text-green-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  in_transit: "bg-yellow-100 text-yellow-700",
  delivery_failed: "bg-red-100 text-red-700",
  exception: "bg-red-100 text-red-700",
  pending: "bg-gray-100 text-gray-600",
};

interface TrackEvent {
  id: number;
  time: string;
  location: string | null;
  description: string;
}

interface TemplateEvent {
  description: string;
  location?: string;
  offsetHours: number;
}

interface Template {
  id: number;
  name: string;
  carrier: { name: string };
  events: TemplateEvent[];
}

interface Package {
  id: number;
  trackingNumber: string;
  status: string;
  statusDetail: string | null;
  note: string | null;
  orderId: string | null;
  buyerName: string | null;
  carrier: { name: string; code: string };
  events: TrackEvent[];
}

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function PackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit basic info
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ status: "", statusDetail: "", note: "", buyerName: "", orderId: "" });
  const [saving, setSaving] = useState(false);

  // Add single event
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ time: toLocalDatetimeValue(new Date()), location: "", description: "" });
  const [addingEvent, setAddingEvent] = useState(false);

  // Apply template
  const [showTemplate, setShowTemplate] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [baseTime, setBaseTime] = useState(toLocalDatetimeValue(new Date()));
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [previewEvents, setPreviewEvents] = useState<{ time: string; location: string; description: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/packages/${id}`);
    if (res.ok) {
      const data = await res.json();
      setPkg(data);
      setEditForm({
        status: data.status,
        statusDetail: data.statusDetail ?? "",
        note: data.note ?? "",
        buyerName: data.buyerName ?? "",
        orderId: data.orderId ?? "",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showTemplate) {
      fetch("/api/admin/templates").then((r) => r.json()).then(setTemplates);
    }
  }, [showTemplate]);

  // Compute preview when template or baseTime changes
  useEffect(() => {
    if (!selectedTemplate || !baseTime) { setPreviewEvents([]); return; }
    const base = new Date(baseTime);
    const events = selectedTemplate.events.map((e) => {
      const t = new Date(base.getTime() + e.offsetHours * 3600 * 1000);
      return { time: t.toISOString(), location: e.location ?? "", description: e.description };
    });
    setPreviewEvents(events);
  }, [selectedTemplate, baseTime]);

  async function handleSaveInfo() {
    setSaving(true);
    await fetch(`/api/admin/packages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    setEditMode(false);
    load();
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    setAddingEvent(true);
    await fetch(`/api/admin/packages/${id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEvent),
    });
    setAddingEvent(false);
    setShowAddEvent(false);
    setNewEvent({ time: toLocalDatetimeValue(new Date()), location: "", description: "" });
    load();
  }

  async function handleDeleteEvent(eventId: number) {
    if (!confirm("确认删除该物流事件？")) return;
    await fetch(`/api/admin/packages/${id}/events/${eventId}`, { method: "DELETE" });
    load();
  }

  async function handleApplyTemplate() {
    if (!selectedTemplate || !previewEvents.length) return;
    setApplyingTemplate(true);
    const lastEvent = previewEvents[0]; // first in array = latest (highest offset)
    // Determine status from last event description
    const desc = lastEvent.description.toLowerCase();
    let status = "in_transit";
    if (desc.includes("livré") || desc.includes("remis")) status = "delivered";
    else if (desc.includes("en livraison") || desc.includes("distribution")) status = "out_for_delivery";
    else if (desc.includes("transit") || desc.includes("traitement")) status = "in_transit";
    else if (desc.includes("confié") || desc.includes("préparation")) status = "info_received";

    await fetch(`/api/admin/packages/${id}/events`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: previewEvents, status }),
    });
    setApplyingTemplate(false);
    setShowTemplate(false);
    setSelectedTemplate(null);
    load();
  }

  async function handleDelete() {
    if (!confirm(`确认删除包裹 ${pkg?.trackingNumber}？此操作不可撤销。`)) return;
    await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
    router.push("/admin/packages");
  }

  if (loading) return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">加载中...</p>
      </main>
    </div>
  );

  if (!pkg) return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 bg-gray-50">
        <p className="text-gray-500">包裹不存在。<Link href="/admin/packages" className="text-blue-600">返回列表</Link></p>
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 bg-gray-50">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/packages" className="text-gray-400 hover:text-gray-600 text-sm">← 返回列表</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900 font-mono">{pkg.trackingNumber}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[pkg.status] ?? "bg-gray-100 text-gray-600"}`}>
            {STATUS_OPTIONS.find((s) => s.value === pkg.status)?.label ?? pkg.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: basic info */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">基本信息</h2>
                {!editMode && (
                  <button onClick={() => setEditMode(true)} className="text-xs text-blue-600 hover:text-blue-800">编辑</button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">状态</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">状态说明</label>
                    <input
                      value={editForm.statusDetail}
                      onChange={(e) => setEditForm({ ...editForm, statusDetail: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">订单号</label>
                    <input
                      value={editForm.orderId}
                      onChange={(e) => setEditForm({ ...editForm, orderId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">买家姓名</label>
                    <input
                      value={editForm.buyerName}
                      onChange={(e) => setEditForm({ ...editForm, buyerName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">备注</label>
                    <input
                      value={editForm.note}
                      onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditMode(false)} className="flex-1 border border-gray-300 rounded-lg py-1.5 text-sm hover:bg-gray-50">取消</button>
                    <button onClick={handleSaveInfo} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-1.5 text-sm font-medium disabled:opacity-60">
                      {saving ? "保存中..." : "保存"}
                    </button>
                  </div>
                </div>
              ) : (
                <dl className="space-y-2 text-sm">
                  <Row label="承运商" value={pkg.carrier.name} />
                  <Row label="订单号" value={pkg.orderId ?? "—"} />
                  <Row label="买家" value={pkg.buyerName ?? "—"} />
                  <Row label="状态说明" value={pkg.statusDetail ?? "—"} />
                  <Row label="备注" value={pkg.note ?? "—"} />
                </dl>
              )}
            </div>

            {/* Danger zone */}
            <div className="bg-white rounded-xl shadow-sm border border-red-100 p-5">
              <h2 className="font-semibold text-red-700 mb-3 text-sm">危险操作</h2>
              <button
                onClick={handleDelete}
                className="w-full border border-red-300 text-red-600 hover:bg-red-50 rounded-lg py-2 text-sm transition-colors"
              >
                删除此包裹
              </button>
            </div>
          </div>

          {/* Right: events */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-800">物流轨迹（{pkg.events.length} 条）</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTemplate(true)}
                    className="text-sm border border-blue-200 text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    应用模板
                  </button>
                  <button
                    onClick={() => setShowAddEvent(true)}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    + 添加事件
                  </button>
                </div>
              </div>

              {pkg.events.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">暂无物流轨迹，请添加事件或应用模板</p>
              ) : (
                <div className="space-y-0">
                  {pkg.events.map((event, i) => (
                    <div key={event.id} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${i === 0 ? "bg-blue-500" : "bg-gray-300"}`} />
                        {i < pkg.events.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                      </div>
                      <div className="pb-4 flex-1 flex items-start justify-between">
                        <div>
                          <p className={`text-sm font-medium ${i === 0 ? "text-gray-900" : "text-gray-600"}`}>
                            {event.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(event.time).toLocaleString("zh-CN")}
                            {event.location && ` · ${event.location}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs ml-3 flex-shrink-0 transition-opacity"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Event Modal */}
        {showAddEvent && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">添加物流事件</h2>
              <form onSubmit={handleAddEvent} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">时间 *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">地点</label>
                  <input
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="例：France"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">描述 *</label>
                  <textarea
                    required
                    rows={3}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="例：Votre colis est en cours de traitement sur le site de tri local."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowAddEvent(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">取消</button>
                  <button type="submit" disabled={addingEvent} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
                    {addingEvent ? "添加中..." : "添加"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Apply Template Modal */}
        {showTemplate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">应用物流模板</h2>
              <p className="text-sm text-gray-500 mb-4">选择模板并设置基准时间（最早那条事件的时间），系统将自动计算所有节点时间。</p>

              {templates.length === 0 ? (
                <p className="text-gray-400 text-sm">暂无模板，请先在<a href="/admin/templates" className="text-blue-600 ml-1">模板管理</a>中创建。</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t)}
                        className={`text-left p-3 border rounded-lg transition-colors ${
                          selectedTemplate?.id === t.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-800">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.carrier.name} · {t.events.length} 个节点</p>
                      </button>
                    ))}
                  </div>

                  {selectedTemplate && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">基准时间（第一条事件的时间）</label>
                        <input
                          type="datetime-local"
                          value={baseTime}
                          onChange={(e) => setBaseTime(e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {previewEvents.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <p className="text-xs font-medium text-gray-600 mb-3">预览轨迹（将替换现有轨迹）：</p>
                          <div className="space-y-2">
                            {[...previewEvents].reverse().map((e, i) => (
                              <div key={i} className="flex gap-3">
                                <div className="w-32 text-xs text-gray-400 flex-shrink-0 pt-0.5">
                                  {new Date(e.time).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                </div>
                                <div>
                                  <p className="text-xs text-gray-700">{e.description}</p>
                                  {e.location && <p className="text-xs text-gray-400">{e.location}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowTemplate(false); setSelectedTemplate(null); }} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">取消</button>
                <button
                  onClick={handleApplyTemplate}
                  disabled={!selectedTemplate || applyingTemplate}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
                >
                  {applyingTemplate ? "应用中..." : "确认应用（替换现有轨迹）"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-gray-400 w-20 flex-shrink-0">{label}</dt>
      <dd className="text-gray-700 break-all">{value}</dd>
    </div>
  );
}
