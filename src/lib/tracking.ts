const TRACK17_BASE = "https://api.17track.net/track/v2.2";

export interface TrackEvent {
  time: string;
  location: string;
  description: string;
}

export interface TrackResult {
  trackingNumber: string;
  status: string;
  statusDetail: string;
  events: TrackEvent[];
  carrierCode?: number;
}

export async function queryTracking(
  trackingNumbers: string[]
): Promise<TrackResult[]> {
  const apiKey = process.env.TRACK17_API_KEY;
  if (!apiKey) {
    return trackingNumbers.map((n) => ({
      trackingNumber: n,
      status: "no_api_key",
      statusDetail: "17TRACK API key not configured",
      events: [],
    }));
  }

  const body = trackingNumbers.map((num) => ({ number: num }));

  const res = await fetch(`${TRACK17_BASE}/gettrackinfo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "17token": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`17TRACK API error: ${res.status}`);
  }

  const data = await res.json();
  const accepted: TrackResult[] = (data?.data?.accepted ?? []).map(
    (item: Record<string, unknown>) => {
      const track = item.track as Record<string, unknown> | undefined;
      const events: TrackEvent[] = ((track?.tracking as Record<string, unknown>[]| undefined) ?? []).map(
        (e: Record<string, unknown>) => ({
          time: String(e.a ?? ""),
          location: String(e.c ?? ""),
          description: String(e.z ?? ""),
        })
      );
      return {
        trackingNumber: String(item.number ?? ""),
        status: mapStatus(Number(track?.e ?? 0)),
        statusDetail: String(track?.z1 ?? ""),
        events,
        carrierCode: Number(track?.c ?? 0),
      };
    }
  );

  return accepted;
}

function mapStatus(code: number): string {
  const map: Record<number, string> = {
    0: "pending",
    10: "info_received",
    20: "in_transit",
    25: "in_transit",
    30: "out_for_delivery",
    35: "delivery_failed",
    40: "delivered",
    50: "expired",
    60: "exception",
  };
  return map[code] ?? "unknown";
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  info_received: "Info reçue",
  in_transit: "En transit",
  out_for_delivery: "En livraison",
  delivery_failed: "Échec livraison",
  delivered: "Livré",
  expired: "Expiré",
  exception: "Exception",
  unknown: "Inconnu",
  no_api_key: "Non configuré",
};
