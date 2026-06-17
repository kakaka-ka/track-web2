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

function deriveStatus(events: TrackingEvent[]): string {
  if (events.length === 0) return "pending";
  // events are sorted desc — [0] is the most recent past event
  const d = events[0].description.toLowerCase();
  if (d.includes("livré") || d.includes("remis") || d.includes("signé")) return "delivered";
  if (d.includes("en livraison") || d.includes("mise en livraison") ||
      (d.includes("distribution") && d.includes("mettre"))) return "out_for_delivery";
  if (d.includes("transit") || d.includes("traitement") || d.includes("tri local")) return "in_transit";
  if (d.includes("confié") || d.includes("préparation") || d.includes("pris en charge")) return "info_received";
  return "in_transit";
}

function sanitize(pkg: PackageWithRelations) {
  const AMAZON_PATTERN = /amazon|amzn|fulfillment by amazon/gi;
  const now = new Date();

  // Delivered packages are locked — show all events
  const isDelivered = pkg.status === "delivered";
  const visibleEvents = isDelivered
    ? pkg.events
    : pkg.events.filter((e) => e.time <= now);

  // Status is always derived from what has actually happened, not stored value
  const effectiveStatus = isDelivered ? "delivered" : deriveStatus(visibleEvents);

  return {
    trackingNumber: pkg.trackingNumber,
    status: effectiveStatus,
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
