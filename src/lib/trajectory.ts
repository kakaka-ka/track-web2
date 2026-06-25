// 服务端轨迹生成：复刻管理端 packages 页的 generateTimestamps + 状态推导。
// 给自发单号(如 ERP 自编的 La Poste 6G... 号，17track 查不到)按模板模拟整条轨迹。

export interface TemplateEventLite {
  description: string;
  location?: string | null;
  sortOrder?: number;
}

export interface GeneratedEvent {
  time: Date;
  location: string | null;
  description: string;
}

// 与管理端 seededRand 完全一致（线性同余），保证服务端/前端生成风格相同。
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// 由单号派生稳定 seed（同号重推得到同一条轨迹，幂等友好）。
export function seedFromString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 233280;
  }
  return h || 1;
}

// 把 eventCount 个时间点随机错落地铺在 [shippedAt, deliveryAt]，最后一个 = deliveryAt。
export function generateTimestamps(
  shippedAt: Date,
  deliveryAt: Date,
  eventCount: number,
  seed: number
): Date[] {
  const rand = seededRand(seed);
  const totalMs = deliveryAt.getTime() - shippedAt.getTime();
  if (totalMs <= 0 || eventCount <= 0) return [];

  const props: number[] = [];
  for (let i = 0; i < eventCount; i++) props.push(rand() + 0.1);
  const sum = props.reduce((a, b) => a + b, 0);
  const normalized = props.map((p) => p / sum);

  const times: Date[] = [];
  let cursor = shippedAt.getTime();
  for (let i = 0; i < eventCount - 1; i++) {
    cursor += normalized[i] * totalMs;
    times.push(new Date(cursor));
  }
  times.push(deliveryAt); // 最后一条 = 签收
  return times;
}

// 按模板事件 + 起止时间生成完整事件列表（顺序同模板 sortOrder）。
export function buildTrajectory(
  templateEvents: TemplateEventLite[],
  shippedAt: Date,
  deliveryAt: Date,
  seed: number
): GeneratedEvent[] {
  const evs = [...templateEvents].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
  const times = generateTimestamps(shippedAt, deliveryAt, evs.length, seed);
  return evs.map((e, i) => ({
    time: times[i] ?? deliveryAt,
    location: e.location ?? null,
    description: e.description,
  }));
}

// 由"已发生(time<=now)"的最新事件推导状态，与 /api/track、管理端口径一致。
export function deriveStatusFromEvents(events: GeneratedEvent[], now: Date): string {
  const past = events.filter((e) => e.time <= now);
  if (past.length === 0) return "pending";
  const d = past[past.length - 1].description.toLowerCase();
  if (d.includes("livré") || d.includes("remis") || d.includes("signé")) return "delivered";
  if (d.includes("livraison") || d.includes("distribution")) return "out_for_delivery";
  if (d.includes("transit") || d.includes("traitement") || d.includes("tri local")) return "in_transit";
  if (d.includes("confié") || d.includes("préparation") || d.includes("pris en charge")) return "info_received";
  return "in_transit";
}
