"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";

interface Carrier {
  id: number;
  name: string;
  code: string;
}

export default function CarriersPage() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/carriers");
    if (res.ok) setCarriers(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/carriers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code }),
    });
    setLoading(false);
    if (res.ok) {
      setName(""); setCode("");
      load();
    } else {
      const data = await res.json();
      setError(data.error ?? "操作失败");
    }
  }

  const PRESETS = [
    { name: "La Poste (Colissimo)", code: "colissimo" },
    { name: "DPD France", code: "dpd_fr" },
    { name: "Chronopost", code: "chronopost" },
    { name: "Mondial Relay", code: "mondial_relay" },
    { name: "GLS France", code: "gls_fr" },
    { name: "UPS", code: "ups" },
    { name: "FedEx", code: "fedex" },
    { name: "DHL", code: "dhl" },
  ];

  async function addPreset(preset: { name: string; code: string }) {
    await fetch("/api/admin/carriers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset),
    });
    load();
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">承运商管理</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 添加表单 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">添加承运商</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：La Poste (Colissimo)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">代码 *</label>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="例：colissimo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
              >
                添加
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">快速添加常用承运商：</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.filter(
                  (p) => !carriers.find((c) => c.code === p.code)
                ).map((p) => (
                  <button
                    key={p.code}
                    onClick={() => addPreset(p)}
                    className="text-xs border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50 text-gray-600"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 列表 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">已有承运商（{carriers.length}）</h2>
            {carriers.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无承运商，请在左侧添加。</p>
            ) : (
              <div className="space-y-2">
                {carriers.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.code}</p>
                    </div>
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
