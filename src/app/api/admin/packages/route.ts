import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = 20;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const where = {
    ...(search && {
      OR: [
        { trackingNumber: { contains: search } },
        { orderId: { contains: search } },
        { buyerName: { contains: search } },
      ],
    }),
    ...(status && { status }),
  };

  const now = new Date();

  const [total, packages] = await Promise.all([
    prisma.package.count({ where }),
    prisma.package.findMany({
      where,
      include: {
        carrier: true,
        events: {
          where: { time: { lte: now } },
          orderBy: { time: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Derive effective status from last past event
  const STATUS_LABELS_MAP: Record<string, string> = {
    pending: "pending", info_received: "info_received", in_transit: "in_transit",
    out_for_delivery: "out_for_delivery", delivered: "delivered",
    delivery_failed: "delivery_failed", exception: "exception", expired: "expired",
  };

  const packagesWithStatus = packages.map((pkg) => {
    if (pkg.status === "delivered") return { ...pkg, events: undefined };
    let effectiveStatus = "pending";
    if (pkg.events.length > 0) {
      const d = pkg.events[0].description.toLowerCase();
      if (d.includes("livré") || d.includes("remis") || d.includes("signé")) effectiveStatus = "delivered";
      else if (d.includes("en livraison") || (d.includes("distribution") && d.includes("mettre"))) effectiveStatus = "out_for_delivery";
      else if (d.includes("transit") || d.includes("traitement") || d.includes("tri local")) effectiveStatus = "in_transit";
      else if (d.includes("confié") || d.includes("préparation") || d.includes("pris en charge")) effectiveStatus = "info_received";
      else effectiveStatus = "in_transit";
    }
    return { ...pkg, status: effectiveStatus, events: undefined };
  });

  return NextResponse.json({ packages: packagesWithStatus, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { trackingNumber, carrierId, orderId, buyerName, note, shippedAt, estimatedDelivery } = body;

  if (!trackingNumber || !carrierId) {
    return NextResponse.json({ error: "trackingNumber and carrierId required" }, { status: 400 });
  }

  const pkg = await prisma.package.create({
    data: {
      trackingNumber,
      carrierId: Number(carrierId),
      orderId,
      buyerName,
      note,
      shippedAt: shippedAt ? new Date(shippedAt) : null,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
    },
    include: { carrier: true },
  });

  return NextResponse.json(pkg, { status: 201 });
}
