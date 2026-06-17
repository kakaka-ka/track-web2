import { NextResponse } from "next/server";

export async function GET() {
  const header = [
    "tracking number",
    "carrier",
    "order id",
    "buyer name",
  ].join(",");

  const example1 = [
    "6GG1805448671",
    "La Poste (Colissimo)",
    "CMD-2024-001",
    "Jean Dupont",
  ].join(",");

  const example2 = [
    "1Z999AA10123456784",
    "UPS",
    "CMD-2024-002",
    "Marie Martin",
  ].join(",");

  const csv = [header, example1, example2].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="import_template.csv"',
    },
  });
}
