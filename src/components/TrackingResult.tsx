"use client";

import { STATUS_LABELS } from "@/lib/tracking";

interface TrackData {
  trackingNumber: string;
  status: string;
  statusDetail: string;
  carrier: { name: string; code: string };
  lastSyncAt: string;
  events: { time: string; location: string; description: string }[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  delivered:        { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500"  },
  out_for_delivery: { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500"   },
  in_transit:       { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500"  },
  info_received:    { bg: "bg-gray-50",   text: "text-gray-600",   dot: "bg-gray-400"   },
  delivery_failed:  { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500"    },
  exception:        { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500"    },
  expired:          { bg: "bg-gray-50",   text: "text-gray-500",   dot: "bg-gray-300"   },
  pending:          { bg: "bg-gray-50",   text: "text-gray-500",   dot: "bg-gray-300"   },
};

function toParisDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

function toParisShort(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric", month: "short", year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
  return { date, time };
}

const STEPS = [
  { key: "info_received",    label: "Info reçue" },
  { key: "in_transit",       label: "En transit" },
  { key: "out_for_delivery", label: "En livraison" },
  { key: "delivered",        label: "Livré" },
];

function ProgressBar({ status }: { status: string }) {
  const stepIdx = STEPS.findIndex((s) => s.key === status);
  const activeStep = stepIdx === -1 ? 0 : stepIdx;

  return (
    <div className="mt-5">
      <div className="flex items-center">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="relative flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full flex-shrink-0 border-2 transition-colors ${
                  i <= activeStep
                    ? "bg-[#1a56db] border-[#1a56db]"
                    : "bg-white border-gray-300"
                }`}
              />
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 transition-colors ${
                  i < activeStep ? "bg-[#1a56db]" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        {STEPS.map((step, i) => (
          <span
            key={step.key}
            className={`text-[11px] ${i === activeStep ? "text-[#1a56db] font-semibold" : "text-gray-400"}`}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function TrackingResult({ data }: { data: TrackData }) {
  const statusLabel = STATUS_LABELS[data.status] ?? data.status;
  const colors = STATUS_COLORS[data.status] ?? STATUS_COLORS.pending;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Top info bar */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Numéro de suivi</p>
            <p className="font-mono font-bold text-gray-900 text-base">{data.trackingNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Transporteur</p>
            <p className="font-semibold text-gray-700 text-sm">{data.carrier.name}</p>
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {statusLabel}
          </span>
        </div>

        <ProgressBar status={data.status} />

        {data.lastSyncAt && (
          <p className="text-[11px] text-gray-400 mt-3">
            Dernière mise à jour : {toParisDate(data.lastSyncAt)}
          </p>
        )}
      </div>

      {/* Events timeline */}
      {data.events.length > 0 ? (
        <div className="px-5 py-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Historique de suivi
          </h3>
          <div className="space-y-0">
            {data.events.map((event, i) => {
              const { date, time } = toParisShort(event.time);
              const isLatest = i === 0;
              return (
                <div key={i} className="flex gap-4">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center w-8 flex-shrink-0">
                    <div
                      className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ring-2 ${
                        isLatest
                          ? "bg-[#1a56db] ring-blue-200"
                          : "bg-gray-300 ring-transparent"
                      }`}
                    />
                    {i < data.events.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 my-1 min-h-[20px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-5 flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${isLatest ? "font-semibold text-gray-900" : "font-medium text-gray-600"}`}>
                      {event.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {date} · {time}
                      {event.location && <span className="ml-1 text-gray-400">· {event.location}</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="px-5 py-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">Aucun événement de suivi disponible pour le moment.</p>
        </div>
      )}
    </div>
  );
}
