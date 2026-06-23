import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { getAdminContext } from "@/lib/adminAuth";

const AMAZON_PATTERN = /amazon|amzn|Amazon\.com/gi;

function cleanValue(val: unknown): string {
  return String(val ?? "").replace(AMAZON_PATTERN, "").trim();
}

const TRACKING_COLS = ["tracking number", "numéro de suivi", "tracking-id", "carrier-tracking-number"];
const CARRIER_COLS = ["carrier", "transporteur", "shipping-carrier", "carrier-name"];
const ORDER_COLS = ["order id", "order-id", "numéro de commande", "amazon order id"];
const BUYER_COLS = ["buyer name", "recipient name", "nom destinataire"];

function findCol(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.findIndex((h) => h.includes(c));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

async function processRows(
  rows: Record<string, unknown>[],
  defaultCarrierId?: number,
  groupId?: number | null
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  if (rows.length === 0) return { imported: 0, skipped: 0, errors: [] };

  const headers = Object.keys(rows[0]);
  const trackingCol = findCol(headers, TRACKING_COLS);
  const carrierCol = findCol(headers, CARRIER_COLS);
  const orderCol = findCol(headers, ORDER_COLS);
  const buyerCol = findCol(headers, BUYER_COLS);

  if (!trackingCol) {
    return { imported: 0, skipped: 0, errors: ["Could not find tracking number column"] };
  }

  const carrierCache = new Map<string, number>();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const trackingNumber = cleanValue(row[trackingCol]);
    if (!trackingNumber) { skipped++; continue; }

    let carrierId = defaultCarrierId;

    if (carrierCol && row[carrierCol]) {
      const rawCarrier = cleanValue(row[carrierCol]);
      const carrierName = rawCarrier || "Unknown";

      if (carrierCache.has(carrierName)) {
        carrierId = carrierCache.get(carrierName);
      } else {
        const existing = await prisma.carrier.findFirst({ where: { name: { equals: carrierName } } });
        if (existing) {
          carrierId = existing.id;
        } else {
          const code = carrierName.toLowerCase().replace(/\s+/g, "_").slice(0, 20);
          const created = await prisma.carrier.create({ data: { name: carrierName, code } });
          carrierId = created.id;
        }
        carrierCache.set(carrierName, carrierId!);
      }
    }

    if (!carrierId) { skipped++; errors.push(`No carrier for: ${trackingNumber}`); continue; }

    try {
      await prisma.package.upsert({
        where: { trackingNumber },
        update: {},
        create: {
          trackingNumber,
          carrierId,
          groupId: groupId ?? null,
          orderId: orderCol ? cleanValue(row[orderCol]) : undefined,
          buyerName: buyerCol ? cleanValue(row[buyerCol]) : undefined,
        },
      });
      imported++;
    } catch {
      skipped++;
      errors.push(`Failed to import: ${trackingNumber}`);
    }
  }

  return { imported, skipped, errors };
}

export async function POST(request: NextRequest) {
  const authResult = await getAdminContext(request);
  if ("denied" in authResult) return authResult.denied;
  const { context } = authResult;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const defaultCarrierId = formData.get("carrierId") ? Number(formData.get("carrierId")) : undefined;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // 确定 groupId
  let packageGroupId: number | null = null;
  if (context.role === "super_admin") {
    const bodyGroupId = formData.get("groupId");
    packageGroupId = bodyGroupId ? Number(bodyGroupId) : null;
  } else {
    packageGroupId = context.groupId;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name.toLowerCase();

  let rows: Record<string, unknown>[] = [];

  if (filename.endsWith(".csv") || filename.endsWith(".txt")) {
    const text = buffer.toString("utf-8");
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    rows = result.data;
  } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  } else {
    return NextResponse.json({ error: "Unsupported file type. Use CSV or XLSX." }, { status: 400 });
  }

  const result = await processRows(rows, defaultCarrierId, packageGroupId);
  return NextResponse.json(result);
}
