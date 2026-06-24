"use client";

import { useState } from "react";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const number = input.trim();
    if (!number) return;
    setLoading(true);
    window.location.href = `/${encodeURIComponent(number)}`;
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 select-none">
            <div className="w-7 h-7 rounded-md bg-[#1a56db] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25" />
              </svg>
            </div>
            <span className="text-[17px] font-bold text-gray-900 tracking-tight">goooootrack</span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-800 transition-colors">Fonctionnalités</a>
            <a href="#carriers" className="hover:text-gray-800 transition-colors">Transporteurs</a>
          </nav>
        </div>
      </header>

      {/* Hero / Search */}
      <section className="bg-gradient-to-b from-[#1a56db] to-[#1e40af] pt-16 pb-20 px-4 text-white text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3 leading-tight">
          Suivi de colis<br className="hidden md:block" /> universel
        </h1>
        <p className="text-blue-200 text-base md:text-lg mb-10 max-w-xl mx-auto">
          Suivez vos colis en temps réel avec tous les transporteurs majeurs
        </p>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <textarea
              className="w-full p-4 text-gray-800 text-sm resize-none focus:outline-none min-h-[72px] placeholder-gray-400"
              placeholder="Entrez un ou plusieurs numéros de suivi..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch(e as unknown as React.FormEvent);
                }
              }}
            />
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-400">Appuyez sur Entrée pour rechercher</span>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#f97316] hover:bg-[#ea6c0a] text-white px-6 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 flex items-center gap-2"
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
          </div>
        </form>

        {/* Carrier logos row */}
        <div className="flex flex-wrap justify-center gap-3 mt-10">
          {["Colissimo", "DPD", "Chronopost", "GLS", "UPS", "FedEx"].map((c) => (
            <span key={c} className="bg-white/10 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full border border-white/20">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Results */}
      <main className="max-w-3xl mx-auto px-4 -mt-6 pb-16">
        {!loading && (
          <>
            {/* Features */}
            <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
              {[
                {
                  icon: (
                    <svg className="w-6 h-6 text-[#1a56db]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                  title: "Temps réel",
                  desc: "Mises à jour automatiques toutes les 30 minutes",
                },
                {
                  icon: (
                    <svg className="w-6 h-6 text-[#1a56db]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                    </svg>
                  ),
                  title: "Mondial",
                  desc: "Suivi international avec tous les transporteurs majeurs",
                },
                {
                  icon: (
                    <svg className="w-6 h-6 text-[#1a56db]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                  title: "Simple & fiable",
                  desc: "Entrez votre numéro, obtenez le statut instantanément",
                },
              ].map((f) => (
                <div key={f.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div id="carriers" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Comment ça marche ?</h2>
              <ol className="space-y-3">
                {[
                  "Copiez le numéro de suivi de votre commande",
                  "Collez-le dans le champ de recherche ci-dessus",
                  "Consultez le statut et l'historique de livraison en temps réel",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#1a56db] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-600">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#1a56db] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-white" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700">goooootrack</span>
          </div>
          <p className="text-xs text-gray-400">© 2026 goooootrack.com — Suivi de colis universel</p>
        </div>
      </footer>
    </div>
  );
}
