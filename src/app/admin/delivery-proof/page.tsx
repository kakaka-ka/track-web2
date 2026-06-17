"use client";

import { useState } from "react";
import AdminNav from "@/components/AdminNav";

export default function DeliveryProofPage() {
  const [form, setForm] = useState({
    trackingNumber: "",
    deliveryDate: new Date().toISOString().slice(0, 10),
    recipientName: "",
    recipientAddress: "",
    postalCode: "",
    city: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/delivery-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "生成失败");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attestation_${form.trackingNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">交货证明</h1>
        <p className="text-gray-500 mb-8">
          生成 Colissimo 风格的 PDF 交货证明（Attestation de livraison）。
        </p>

        <div className="max-w-lg bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleGenerate} className="space-y-4">

            {/* 运单号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">运单号 *</label>
              <input
                required
                value={form.trackingNumber}
                onChange={(e) => set("trackingNumber", e.target.value)}
                placeholder="例：6GG1805448671"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 派送日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">派送日期 *</label>
              <input
                required
                type="date"
                value={form.deliveryDate}
                onChange={(e) => set("deliveryDate", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 收件人姓名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">收件人姓名 *</label>
              <input
                required
                value={form.recipientName}
                onChange={(e) => set("recipientName", e.target.value)}
                placeholder="例：Mme BILBAO Françoise"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 街道地址 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">街道地址</label>
              <input
                value={form.recipientAddress}
                onChange={(e) => set("recipientAddress", e.target.value)}
                placeholder="例：21B Boulevard Jean D Amou"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 邮编 + 城市 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮政编码</label>
                <input
                  value={form.postalCode}
                  onChange={(e) => set("postalCode", e.target.value)}
                  placeholder="例：64100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="例：Bayonne"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {loading ? "生成中..." : "生成并下载 PDF"}
            </button>
          </form>

          {/* 预览说明 */}
          <div className="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs font-medium text-gray-600 mb-2">生成的 PDF 包含：</p>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li>Colissimo 橙色信头</li>
              <li>La Poste 官方地址与收件人地址</li>
              <li>运单号 + 派送日期的正式声明</li>
              <li>La Poste 服务总监签名栏</li>
              <li>官方页脚（注册信息 + 黄色品牌标）</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
