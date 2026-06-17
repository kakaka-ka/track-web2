/**
 * Setup script: apply migrations and seed initial carrier data.
 * Run once: node scripts/setup.js
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../prisma/dev.db");
const MIGRATION_PATH = path.join(
  __dirname,
  "../prisma/migrations/20260609055836_init/migration.sql"
);

const db = new Database(DB_PATH);

// Apply migration if tables don't exist
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Carrier'")
  .all();

if (tables.length === 0) {
  console.log("Applying migration...");
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  db.exec(sql);
  console.log("Migration applied.");
} else {
  console.log("Tables already exist, skipping migration.");
}

// Seed default carriers
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

const insertCarrier = db.prepare(
  "INSERT OR IGNORE INTO Carrier (name, code, createdAt) VALUES (?, ?, ?)"
);

for (const c of carriers) {
  insertCarrier.run(c.name, c.code, new Date().toISOString());
}

console.log("Default carriers seeded.");
db.close();
console.log("Setup complete. Run: npm run dev");
