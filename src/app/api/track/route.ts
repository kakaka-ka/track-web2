import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queryTracking } from "@/lib/tracking";
import type { Carrier, Package, TrackingEvent } from "@/generated/prisma";

type PackageWithRelations = Package & {
  carrier: Carrier;
  events: TrackingEvent[];
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const number = searchParams.get("number");

  if (!number) {
    return NextResponse.json({ error: "Tracking number required" }, { status: 400 });
  }

  const pkg = await prisma.package.findUnique({
    where: { trackingNumber: number },
    include: {
      carrier: true,
      events: { orderBy: { time: "desc" } },
    },
  });

  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const staleMinutes = 30;
  const isStale =
    !pkg.lastSyncAt ||
    Date.now() - pkg.lastSyncAt.getTime() > staleMinutes * 60 * 1000;

  if (isStale) {
    try {
      const [result] = await queryTracking([number]);
      if (result) {
        await prisma.$transaction(async (tx) => {
          await tx.package.update({
            where: { id: pkg.id },
            data: {
              status: result.status,
              statusDetail: result.statusDetail,
              lastSyncAt: new Date(),
            },
          });
          if (result.events.length > 0) {
            await tx.trackingEvent.deleteMany({ where: { packageId: pkg.id } });
            await tx.trackingEvent.createMany({
              data: result.events.map((e) => ({
                packageId: pkg.id,
                time: new Date(e.time),
                location: e.location,
                description: e.description,
              })),
            });
          }
        });

        const updated = await prisma.package.findUnique({
          where: { id: pkg.id },
          include: {
            carrier: true,
            events: { orderBy: { time: "desc" } },
          },
        });
        return NextResponse.json(sanitize(updated!));
      }
    } catch {
      // Return cached data on API failure
    }
  }

  return NextResponse.json(sanitize(pkg));
}

function sanitize(pkg: PackageWithRelations) {
  const AMAZON_PATTERN = /amazon|amzn|fulfillment by amazon/gi;
  const nowParis = new Date(); // UTC, compare directly with stored UTC times

  // Only show events that have already happened (time <= now)
  // If package is delivered, show all events (locked)
  const visibleEvents = pkg.status === "delivered"
    ? pkg.events
    : pkg.events.filter((e) => e.time <= nowParis);

  return {
    trackingNumber: pkg.trackingNumber,
    status: pkg.status,
    statusDetail: pkg.statusDetail?.replace(AMAZON_PATTERN, ""),
    carrier: {
      name: pkg.carrier.name.replace(AMAZON_PATTERN, ""),
      code: pkg.carrier.code,
    },
    lastSyncAt: pkg.lastSyncAt,
    events: visibleEvents.map((e) => ({
      time: e.time,
      location: e.location?.replace(AMAZON_PATTERN, ""),
      description: e.description.replace(AMAZON_PATTERN, ""),
    })),
  };
}
