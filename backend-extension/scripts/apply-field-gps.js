#!/usr/bin/env node
/**
 * Applies ONLY the Field GPS module to a Sun Sea ERP checkout (backend + frontend).
 * Independent of apply-schema.js (the full mobile module); safe to run on a plain ERP.
 *
 *   node sun-sea-mobile/backend-extension/scripts/apply-field-gps.js sunsea-main
 *
 * Backend: appends the FieldAgentPosition model, copies src/modules/field-gps,
 *          mounts /api/field. Then: npx prisma migrate dev -n field_gps (or db push).
 * Frontend: replaces modules/dashboard/salesforce/salesTeam.ts with the live-feed
 *           version and switches the TV field-sales scene to it.
 */
const fs = require("fs");
const path = require("path");

const root = process.argv[2];
if (!root) {
  console.error("usage: apply-field-gps.js <path-to-sunsea-main>");
  process.exit(1);
}
const backendDir = fs.existsSync(path.join(root, "backend")) ? path.join(root, "backend") : root;
const frontendDir = path.join(path.dirname(backendDir), "frontend");
const extDir = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, s) => {
  fs.writeFileSync(p, s);
  console.log("  wrote", path.relative(process.cwd(), p));
};

// ── backend ──────────────────────────────────────────────────────────────────
const schemaPath = path.join(backendDir, "prisma", "schema.prisma");
const routesPath = path.join(backendDir, "src", "routes", "index.routes.ts");
for (const p of [schemaPath, routesPath]) if (!fs.existsSync(p)) (console.error("✖ missing", p), process.exit(1));

let schema = read(schemaPath);
if (!schema.includes("model FieldAgentPosition")) {
  write(schemaPath, schema.trimEnd() + "\n" + read(path.join(extDir, "prisma", "field-gps.prisma")));
} else console.log("  schema already has FieldAgentPosition");

let routes = read(routesPath);
if (!routes.includes("field-gps.routes")) {
  routes = routes.replace(/(import categoryRoutes[^\n]*\n)/, '$1import fieldGpsRoutes from "../modules/field-gps/field-gps.routes";\n');
  routes = routes.replace(/(router\.use\("\/categories", categoryRoutes\);\n)/, '$1router.use("/field", fieldGpsRoutes);\n');
  if (!routes.includes('router.use("/field"')) (console.error("✖ could not anchor the /field mount — add it manually"), process.exit(1));
  write(routesPath, routes);
} else console.log("  routes already mount /field");

const src = path.join(extDir, "src", "modules", "field-gps");
const dest = path.join(backendDir, "src", "modules", "field-gps");
fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dest, f));
console.log("  copied src/modules/field-gps");

// ── frontend ─────────────────────────────────────────────────────────────────
if (fs.existsSync(frontendDir)) {
  const rosterPath = path.join(frontendDir, "src", "modules", "dashboard", "salesforce", "salesTeam.ts");
  const scenePath = path.join(frontendDir, "src", "modules", "dashboard", "tv", "scenes", "SceneFieldSales.tsx");
  if (fs.existsSync(rosterPath)) {
    fs.copyFileSync(path.join(extDir, "frontend-patch", "salesTeam.ts"), rosterPath);
    console.log("  replaced frontend salesTeam.ts with the live-feed version");
  }
  if (fs.existsSync(scenePath)) {
    let scene = read(scenePath);
    if (!scene.includes("useFieldTeam")) {
      scene = scene
        .replace(/import \{\s*useSimulatedPositions,\s*SALES_GPS_IS_LIVE,\s*type SalesPerson,?\s*\} from "\.\.\/\.\.\/salesforce\/salesTeam";/, 'import { useFieldTeam, type SalesPerson } from "../../salesforce/salesTeam";')
        .replace(/const team = useSimulatedPositions\(\);/, "const { team, isLive } = useFieldTeam();")
        .replace(/!SALES_GPS_IS_LIVE/g, "!isLive")
        .replace(/SALES_GPS_IS_LIVE/g, "isLive");
      write(scenePath, scene);
    } else console.log("  scene already uses useFieldTeam");
  }
}
console.log("\nNext: cd backend && npx prisma migrate dev -n field_gps && npx tsc --noEmit\n      cd frontend && npm run build");
