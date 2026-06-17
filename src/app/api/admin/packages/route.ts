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

  const [total, packages] = await Promise.all([
    prisma.package.count({ where }),
    prisma.package.findMany({
      where,
      include: { carrier: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ packages, total, page, pageSize });
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
