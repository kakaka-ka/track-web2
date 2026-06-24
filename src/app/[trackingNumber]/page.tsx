import { notFound, redirect } from "next/navigation";
import TrackingResult from "@/components/TrackingResult";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ trackingNumber: string }>;
}

// 排除非单号路径（比如 favicon.ico 误入动态路由）
const EXCLUDED = new Set(["favicon.ico", "robots.txt", "sitemap.xml"]);

async function fetchTrackData(trackingNumber: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://goooootrack.com";
  const res = await fetch(`${base}/api/track?number=${encodeURIComponent(trackingNumber)}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackingNumber } = await params;
  return {
    title: `${trackingNumber} — goooootrack`,
    description: `Suivi du colis ${trackingNumber}`,
  };
}

export default async function TrackingPage({ params }: Props) {
  const { trackingNumber } = await params;

  if (EXCLUDED.has(trackingNumber)) notFound();

  let data = null;
  let notInSystem = false;

  try {
    data = await fetchTrackData(trackingNumber);
    if (!data) notInSystem = true;
  } catch {
    // fall through to error UI
  }

  // 不在系统里 → 跳转 17track
  if (notInSystem) {
    redirect(`https://t.17track.net/fr#nums=${encodeURIComponent(trackingNumber)}&fc=6051`);
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
          <a href="/" className="text-sm text-blue-600 hover:underline">← Nouvelle recherche</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {data ? (
          <TrackingResult data={data} />
        ) : (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 text-sm">
            Erreur lors de la récupération du suivi. Veuillez réessayer plus tard.
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white mt-8">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">goooootrack</span>
          <p className="text-xs text-gray-400">© 2026 goooootrack.com</p>
        </div>
      </footer>
    </div>
  );
}
