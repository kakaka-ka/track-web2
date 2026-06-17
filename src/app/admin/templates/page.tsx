"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";

interface Carrier { id: number; name: string; }
interface TemplateEvent { description: string; location: string; offsetHours: number; }
interface Template {
  id: number;
  name: string;
  description: string | null;
  carrier: Carrier | null;
  events: TemplateEvent[];
}

// 预设真实 Colissimo 轨迹（偏移小时数从第一条事件起算，正数 = 之后）
const PRESETS: { label: string; events: TemplateEvent[] }[] = [
  {
    label: "Colissimo 标准流程（5节点）",
    events: [
      { description: "FR, Votre colis est sur son site de distribution. Nous le préparons pour le mettre en livraison.", location: "France", offsetHours: 15 },
      { description: "FR, Votre Colissimo est en cours de traitement sur le site de tri local.", location: "France", offsetHours: 14 },
      { description: "FR, Votre Colissimo va bientôt nous être confié ! Il est en cours de préparation chez votre expéditeur.", location: "France", offsetHours: 8 },
      { description: "FR, Votre colis est en transit sur nos plateformes logistiques.", location: "France", offsetHours: 7 },
      { description: "FR, Votre Colissimo va bientôt nous être confié ! Il est en cours de préparation chez votre expéditeur.", location: "France", offsetHours: 0 },
    ],
  },
  {
    label: "Colissimo 已签收（6节点）",
    events: [
      { description: "FR, Votre Colissimo a été remis au destinataire.", location: "France", offsetHours: 23 },
      { description: "FR, Votre colis est pris en charge par votre facteur pour être livré.", location: "France", offsetHours: 21 },
      { description: "FR, Votre colis est sur son site de distribution. Nous le préparons pour le mettre en livraison.", location: "France", offsetHours: 15 },
      { description: "FR, Votre Colissimo est en cours de traitement sur le site de tri local.", location: "France", offsetHours: 14 },
      { description: "FR, Votre colis est en transit sur nos plateformes logistiques.", location: "France", offsetHours: 7 },
      { description: "FR, Votre Colissimo va bientôt nous être confié ! Il est en cours de préparation chez votre expéditeur.", location: "France", offsetHours: 0 },
    ],
  },
  {
    label: "DPD France 标准流程",
    events: [
      { description: "Votre colis est en cours de livraison.", location: "France", offsetHours: 16 },
      { description: "Votre colis est arrivé dans notre dépôt local.", location: "France", offsetHours: 14 },
      { description: "Votre colis est en transit vers le dépôt de livraison.", location: "France", offsetHours: 8 },
      { description: "Votre colis a été pris en charge par DPD.", location: "France", offsetHours: 0 },
    ],
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [name, setName] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<TemplateEvent[]>([
    { description: "", location: "", offsetHours: 0 },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  async function load() {
    const [t, c] = await Promise.all([
      fetch("/api/admin/templates").then((r) => r.json()),
      fetch("/api/admin/carriers").then((r) => r.json()),
    ]);
    setTemplates(Array.isArray(t) ? t : []);
    setCarriers(Array.isArray(c) ? c : []);
  }

  useEffect(() => { load(); }, []);

  function applyPreset(preset: typeof PRESETS[0]) {
    setEvents(preset.events.map((e) => ({ ...e })));
  }

  function addEventRow() {
    setEvents([...events, { description: "", location: "", offsetHours: 0 }]);
  }

  function removeEventRow(i: number) {
    setEvents(events.filter((_, idx) => idx !== i));
  }

  function updateEvent(i: number, field: keyof TemplateEvent, value: string | number) {
    setEvents(events.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const validEvents = events.filter((ev) => ev.description.trim());
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, carrierId: Number(carrierId), description, events: validEvents }),
    });
    setLoading(false);
    if (res.ok) {
      setName(""); setCarrierId(""); setDescription("");
      setEvents([{ description: "", location: "", offsetHours: 0 }]);
      load();
    } else {
      const data = await res.json();
      setError(data.error ?? "操作失败");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确认删除该模板？")) return;
    await fetch("/api/admin/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">物流模板</h1>
        <p className="text-gray-500 mb-6">
          预设真实物流轨迹，应用到包裹时只需设置基准时间，系统自动生成所有节点。
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* 新建表单 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">新建模板</h2>

            {/* 快速预设 */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-medium text-blue-800 mb-2">快速套用预设轨迹：</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button key={p.label} onClick={() => applyPreset(p)}
                    className="text-xs bg-white border border-blue-200 text-blue-700 rounded-full px-3 py-1 hover:bg-blue-100">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">模板名称 *</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="例：Colissimo 标准"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">承运商（可选）</label>
                  <select value={carrierId} onChange={(e) => setCarrierId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">不指定承运商</option>
                    {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* 轨迹节点 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">
                    轨迹节点（共 {events.length} 条，时间偏移从第 1 条起算）
                  </label>
                  <button type="button" onClick={addEventRow}
                    className="text-xs text-blue-600 hover:text-blue-800">+ 添加节点</button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {events.map((ev, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">节点 {i + 1}</span>
                        {events.length > 1 && (
                          <button type="button" onClick={() => removeEventRow(i)}
                            className="text-xs text-red-400 hover:text-red-600">删除</button>
                        )}
                      </div>
                      <textarea
                        required
                        rows={2}
                        value={ev.description}
                        onChange={(e) => updateEvent(i, "description", e.target.value)}
                        placeholder="轨迹描述（法语/中文均可）"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none mb-2"
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            value={ev.location}
                            onChange={(e) => updateEvent(i, "location", e.target.value)}
                            placeholder="地点（可选，如 France）"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                        <div className="w-36">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={ev.offsetHours}
                              onChange={(e) => updateEvent(i, "offsetHours", Number(e.target.value))}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                            <span className="text-xs text-gray-400 whitespace-nowrap">小时后</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
                {loading ? "创建中..." : "创建模板"}
              </button>
            </form>
          </div>

          {/* 模板列表 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">已有模板（{templates.length}）</h2>
            {templates.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无模板，在左侧创建第一个。</p>
            ) : (
              <div className="space-y-3">
                {templates.map((t) => (
                  <div key={t.id} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.carrier?.name ?? "不限承运商"} · {t.events.length} 个节点</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                          className="text-xs text-red-400 hover:text-red-600">删除</button>
                        <span className="text-gray-300 text-xs">{expandedId === t.id ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {expandedId === t.id && t.events.length > 0 && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                        {t.events.map((ev, i) => (
                          <div key={i} className="flex gap-3 text-xs">
                            <span className="text-gray-400 w-20 flex-shrink-0">+{ev.offsetHours}h</span>
                            <div>
                              <p className="text-gray-700">{ev.description}</p>
                              {ev.location && <p className="text-gray-400">{ev.location}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
