/**
 * Setup script: seed initial carrier data.
 * Run after prisma migrate deploy: node scripts/setup.js
 */

const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

const carriers = [
  { name: "La Poste (Colissimo)", code: "colissimo" },
  { name: "DPD France", code: "dpd_fr" },
  { name: "Chronopost", code: "chronopost" },
  { name: "Mondial Relay", code: "mondial_relay" },
  { name: "GLS France", code: "gls_fr" },
  { name: "UPS", code: "ups" },
  { name: "FedEx", code: "fedex" },
  { name: "DHL", code: "dhl" },
];

async function main() {
  for (const c of carriers) {
    await prisma.carrier.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.log("Default carriers seeded.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
