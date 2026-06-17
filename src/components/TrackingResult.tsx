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

const STATUS_COLORS: Record<string, string> = {
  delivered: "bg-green-100 text-green-800",
  out_for_delivery: "bg-blue-100 text-blue-800",
  in_transit: "bg-yellow-100 text-yellow-800",
  info_received: "bg-gray-100 text-gray-700",
  delivery_failed: "bg-red-100 text-red-800",
  exception: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-500",
  pending: "bg-gray-100 text-gray-500",
};

function toParisDate(iso: string): string {
  const d = new Date(iso);
  const paris = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => paris.find((p) => p.type === t)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")} à ${get("hour")}:${get("minute")}`;
}

export default function TrackingResult({ data }: { data: TrackData }) {
  const statusLabel = STATUS_LABELS[data.status] ?? data.status;
  const statusColor = STATUS_COLORS[data.status] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Top bar */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">Numéro de suivi</p>
            <p className="font-mono font-semibold text-gray-800 text-lg">{data.trackingNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-1">Transporteur</p>
            <p className="font-semibold text-gray-700">{data.carrier.name}</p>
          </div>
        </div>

        {/* Status — hide internal/config states from public view */}
        {data.status !== "no_api_key" && (
          <div className="mt-4 flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
              {statusLabel}
            </span>
            {data.statusDetail && (
              <span className="text-sm text-gray-500">{data.statusDetail}</span>
            )}
          </div>
        )}

        {/* Progress bar */}
        <ProgressBar status={data.status} />

        {data.lastSyncAt && (
          <p className="text-xs text-gray-400 mt-3">
            Dernière mise à jour : {toParisDate(data.lastSyncAt)}
          </p>
        )}
      </div>

      {/* Events timeline */}
      {data.events.length > 0 && (
        <div className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Historique de suivi</h3>
          <div className="space-y-0">
            {data.events.map((event, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${i === 0 ? "bg-blue-500" : "bg-gray-300"}`} />
                  {i < data.events.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200 my-1" />
                  )}
                </div>
                <div className={`pb-4 ${i === data.events.length - 1 ? "" : ""}`}>
                  <p className={`text-sm font-medium ${i === 0 ? "text-gray-900" : "text-gray-600"}`}>
                    {event.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {toParisDate(event.time)}
                    {event.location && ` · ${event.location}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.events.length === 0 && (
        <div className="p-5 text-center text-gray-400 text-sm">
          Aucun événement de suivi disponible pour le moment.
        </div>
      )}
    </div>
  );
}

const STEPS = ["info_received", "in_transit", "out_for_delivery", "delivered"];

function ProgressBar({ status }: { status: string }) {
  const stepIdx = STEPS.indexOf(status);
  const activeStep = stepIdx === -1 ? 0 : stepIdx;

  return (
    <div className="mt-4">
      <div className="flex items-center">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div
              className={`w-4 h-4 rounded-full flex-shrink-0 border-2 ${
                i <= activeStep
                  ? "bg-blue-500 border-blue-500"
                  : "bg-white border-gray-300"
              }`}
            />
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-1 ${i < activeStep ? "bg-blue-500" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {STEPS.map((step) => (
          <span key={step} className="text-xs text-gray-400">
            {STATUS_LABELS[step]}
          </span>
        ))}
      </div>
    </div>
  );
}
