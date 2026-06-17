import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

const FR_MONTHS = [
  "janvier","février","mars","avril","mai","juin",
  "juillet","août","septembre","octobre","novembre","décembre",
];
function toFrenchDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { trackingNumber, deliveryDate, recipientName, recipientAddress, postalCode, city } = body;

  if (!trackingNumber || !deliveryDate || !recipientName) {
    return NextResponse.json({ error: "trackingNumber, deliveryDate, recipientName required" }, { status: 400 });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const H = 841.89;
  const W = 595.28;
  const margin = 42;

  // Fonts
  const reg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Colors
  const black    = rgb(0, 0, 0);
  const darkText = rgb(0.15, 0.15, 0.15);
  const gray     = rgb(0.45, 0.45, 0.45);
  const green    = rgb(0.0, 0.47, 0.13);
  const lineGray = rgb(0.7, 0.7, 0.7);

  // ── Embed logos ──
  const assetsDir = path.join(process.cwd(), "src", "assets");
  const colissimoImg = await pdfDoc.embedPng(fs.readFileSync(path.join(assetsDir, "colissimo-logo.png")));
  const laposteImg   = await pdfDoc.embedPng(fs.readFileSync(path.join(assetsDir, "laposte-logo.png")));

  // ── Colissimo logo (top-left) ──
  const logoW = 130;
  const logoH = (colissimoImg.height / colissimoImg.width) * logoW;
  page.drawImage(colissimoImg, { x: margin, y: H - margin - logoH, width: logoW, height: logoH });

  // ── La Poste Solutions Business logo (top-right) ──
  const lpW = 58;
  const lpH = (laposteImg.height / laposteImg.width) * lpW;
  page.drawImage(laposteImg, { x: W - margin - lpW, y: H - margin - lpH, width: lpW, height: lpH });

  // ── Outer table box ──
  const boxTop    = H - margin - 80;
  const boxBottom = boxTop - 100;
  const boxLeft   = margin;
  const boxRight  = W - margin;
  const divX      = 230; // vertical divider x

  // Box border
  page.drawRectangle({ x: boxLeft, y: boxBottom, width: boxRight - boxLeft, height: boxTop - boxBottom, borderColor: lineGray, borderWidth: 0.5, color: rgb(1,1,1) });
  // Vertical divider
  page.drawLine({ start: { x: divX, y: boxBottom }, end: { x: divX, y: boxTop }, thickness: 0.5, color: lineGray });

  // ── Left cell: sender info ──
  let ly = boxTop - 14;
  const lx = boxLeft + 8;
  page.drawText("La Poste", { x: lx, y: ly, size: 9, font: reg, color: darkText });
  ly -= 13;
  page.drawText("Branche Services-Courrier-Colis", { x: lx, y: ly, size: 9, font: reg, color: darkText });
  ly -= 13;
  page.drawText("Bu Colis - Direction des Services Clients", { x: lx, y: ly, size: 9, font: reg, color: darkText });

  // ── Right cell: recipient + date ──
  const rx = divX + 10;
  let ry = boxTop - 14;
  page.drawText(recipientName, { x: rx, y: ry, size: 10, font: reg, color: darkText });
  ry -= 14;
  if (recipientAddress) {
    page.drawText(recipientAddress, { x: rx, y: ry, size: 10, font: reg, color: darkText });
    ry -= 14;
  }
  if (postalCode || city) {
    page.drawText(`${postalCode ?? ""} ${city ?? ""}`.trim(), { x: rx, y: ry, size: 10, font: reg, color: darkText });
    ry -= 14;
  }
  page.drawText("FRANCE", { x: rx, y: ry, size: 10, font: reg, color: darkText });
  ry -= 22;
  page.drawText(`Le ${toFrenchDate(deliveryDate)}`, { x: rx, y: ry, size: 10, font: reg, color: darkText });

  // ── Object row ──
  const objY = boxBottom - 22;
  // Left label
  page.drawText("Objet :", { x: boxLeft + 8, y: objY, size: 10, font: bold, color: darkText });
  // Right value
  page.drawText("Attestation de livraison", { x: divX + 10, y: objY, size: 10, font: reg, color: darkText });
  // Bottom border for object row
  page.drawLine({ start: { x: boxLeft, y: objY - 10 }, end: { x: boxRight, y: objY - 10 }, thickness: 0.5, color: lineGray });
  // Vertical divider in object row
  page.drawLine({ start: { x: divX, y: objY - 10 }, end: { x: divX, y: boxBottom }, thickness: 0.5, color: lineGray });
  // Left border of object row
  page.drawLine({ start: { x: boxLeft, y: boxBottom }, end: { x: boxLeft, y: objY - 10 }, thickness: 0.5, color: lineGray });
  page.drawLine({ start: { x: boxRight, y: boxBottom }, end: { x: boxRight, y: objY - 10 }, thickness: 0.5, color: lineGray });

  // ── Salutation ──
  const bodyY = objY - 45;
  page.drawText("Madame, Monsieur,", { x: margin, y: bodyY, size: 10, font: reg, color: black });

  // ── Paragraph 1 ──
  const p1y = bodyY - 38;
  const addrPart = [recipientAddress, [postalCode, city].filter(Boolean).join(" ")].filter(Boolean).join(" ");
  const p1 = [
    "Selon les éléments de notre système d'information nous sommes en mesure de vous confirmer que le",
    `colis n°  ${trackingNumber}, destiné à ${recipientName} - ${addrPart}`,
    `${[postalCode, city].filter(Boolean).join(" ")} a bien été livré  Le ${toFrenchDate(deliveryDate)}.`,
  ];
  p1.forEach((line, i) => {
    page.drawText(line, { x: margin, y: p1y - i * 15, size: 10, font: reg, color: black });
  });

  // ── Paragraph 2 ──
  const p2y = p1y - 60;
  const p2 = [
    "Je vous remercie de la confiance que vous accordez à Colissimo et vous prie d'agréer, Madame, Monsieur,",
    "l'assurance de ma considération distinguée.",
  ];
  p2.forEach((line, i) => {
    page.drawText(line, { x: margin, y: p2y - i * 15, size: 10, font: reg, color: black });
  });

  // ── Signature ──
  page.drawText("La Direction du Service Clients Colissimo", {
    x: margin, y: p2y - 52, size: 10, font: reg, color: black,
  });

  // ── Footer ──
  const footerY = 52;
  page.drawLine({ start: { x: 0, y: footerY + 22 }, end: { x: W, y: footerY + 22 }, thickness: 0.5, color: lineGray });

  // Left: ECOLOGIC badge
  page.drawText("ECOLOG'IC", { x: margin, y: footerY + 10, size: 7.5, font: bold, color: green });
  page.drawText("Priorité neutralité carbone", { x: margin, y: footerY + 1, size: 6.5, font: reg, color: gray });
  page.drawText("laposte.fr/neutralitecarbone", { x: margin, y: footerY - 8, size: 6.5, font: reg, color: gray });

  // Center: company info
  const ci = "La Poste - SA au capital de 5 364 851 364 euros - 356 000 000 RCS Paris";
  const ci2 = "Siège social : 9 RUE DU COLONEL PIERRE AVIA - 75015 PARIS";
  page.drawText(ci,  { x: 142, y: footerY + 10, size: 6.5, font: reg, color: gray });
  page.drawText(ci2, { x: 142, y: footerY + 1,  size: 6.5, font: reg, color: gray });

  // Right: La Poste logo
  const lpFW = 52;
  const lpFH = (laposteImg.height / laposteImg.width) * lpFW;
  page.drawImage(laposteImg, { x: W - margin - lpFW, y: footerY - 10, width: lpFW, height: lpFH });

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attestation_${trackingNumber}.pdf"`,
    },
  });
}
