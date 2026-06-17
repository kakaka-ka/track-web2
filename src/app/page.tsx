"use client";

import { useState } from "react";
import TrackingResult from "@/components/TrackingResult";

interface TrackData {
  trackingNumber: string;
  status: string;
  statusDetail: string;
  carrier: { name: string; code: string };
  lastSyncAt: string;
  events: { time: string; location: string; description: string }[];
}

export default function HomePage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const number = input.trim();
    if (!number) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/track?number=${encodeURIComponent(number)}`);
      if (res.status === 404) {
        setError("Numéro de suivi introuvable. Vérifiez le numéro et réessayez.");
      } else if (!res.ok) {
        setError("Erreur de serveur. Veuillez réessayer plus tard.");
      } else {
        const data = await res.json();
        setResult(data);
      }
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900">SuiviColis</span>
          </div>
          <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600">Admin</a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-500 py-16 px-4 text-white text-center">
        <h1 className="text-3xl font-bold mb-2">Suivi de Colis Tout-en-Un</h1>
        <p className="text-blue-100 mb-8">Suivez vos colis en temps réel, partout dans le monde</p>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="flex bg-white rounded-xl shadow-lg overflow-hidden">
            <textarea
              className="flex-1 p-4 text-gray-800 text-sm resize-none focus:outline-none min-h-[80px]"
              placeholder="Entrez votre numéro de suivi..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch(e as unknown as React.FormEvent);
                }
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 font-semibold transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              Suivre
            </button>
          </div>
        </form>
      </section>

      {/* Results */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}
        {result && <TrackingResult data={result} />}

        {!result && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[
              { icon: "🚚", title: "Suivi en temps réel", desc: "Mises à jour automatiques toutes les 30 minutes" },
              { icon: "🌍", title: "Transporteurs intégrés", desc: "Colissimo, DPD, Chronopost et plus" },
              { icon: "📦", title: "Simple et rapide", desc: "Entrez votre numéro et obtenez le statut instantanément" },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
