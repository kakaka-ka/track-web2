"use client";

import { useState, useEffect } from "react";
import AdminNav from "@/components/AdminNav";

interface Carrier {
  id: number;
  name: string;
  code: string;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [carrierId, setCarrierId] = useState("");
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/admin/carriers").then((r) => r.json()).then(setCarriers);
  }, []);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    if (carrierId) formData.append("carrierId", carrierId);
    const res = await fetch("/api/admin/import", { method: "POST", body: formData });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">导入包裹</h1>
        <p className="text-gray-500 mb-2">
          上传亚马逊导出的 CSV 或 Excel 文件，系统将自动过滤亚马逊相关信息。
        </p>
        <a
          href="/api/admin/import-template"
          download
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          下载 CSV 导入模板
        </a>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择文件（CSV 或 Excel）*
              </label>
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                {file ? (
                  <div>
                    <p className="text-sm font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-sm text-gray-500">点击选择文件</p>
                    <p className="text-xs text-gray-400 mt-1">支持 .csv、.xlsx、.xls</p>
                  </div>
                )}
                <input
                  id="file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                默认承运商（可选）
              </label>
              <select
                value={carrierId}
                onChange={(e) => setCarrierId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">从文件自动识别</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                若文件中有承运商列，将优先使用文件中的数据。
              </p>
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? "导入中..." : "开始导入"}
            </button>
          </form>

          {result && (
            <div className="mt-5 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">导入结果</h3>
              <div className="flex gap-4 text-sm mb-2">
                <span className="text-green-700 font-medium">✓ 成功 {result.imported} 条</span>
                <span className="text-gray-500">跳过 {result.skipped} 条</span>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-red-600 mb-1">错误详情：</p>
                  <ul className="text-xs text-red-500 space-y-0.5">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li className="text-gray-400">... 还有 {result.errors.length - 5} 条</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作说明 */}
        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5 max-w-lg">
          <h3 className="font-semibold text-blue-900 mb-2">如何从亚马逊导出数据？</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>登录亚马逊卖家中心 → 订单 → 管理订单</li>
            <li>按所需时间段筛选</li>
            <li>点击「下载订单报告」</li>
            <li>选择 CSV 格式并下载</li>
            <li>在此处上传该文件即可</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
