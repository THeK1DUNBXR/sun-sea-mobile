#!/usr/bin/env node
/**
 * Applies the mobile-app additions to an existing Sun Sea ERP backend checkout.
 *
 *   node backend-extension/scripts/apply-schema.js <path-to-sunsea-backend>
 *
 * Idempotent — safe to run again after pulling upstream changes. It:
 *   1. appends prisma/mobile-models.prisma to prisma/schema.prisma
 *   2. adds the back-relations on Customer and Route
 *   3. registers the "mobile-app" permission module in permissionRegistry.ts
 *   4. mounts the /api/mobile router in routes/index.routes.ts
 *   5. copies src/modules/mobile into the backend
 * Afterwards run `npx prisma migrate dev --name mobile_app` (or `prisma db push`)
 * and `npx prisma generate`, then restart the server.
 */
const fs = require("fs");
const path = require("path");

const backendDir = path.resolve(process.argv[2] || ".");
const extDir = path.resolve(__dirname, "..");

function read(p) {
  return fs.readFileSync(p, "utf8");
}
function write(p, s) {
  fs.writeFileSync(p, s);
  console.log("  updated", path.relative(backendDir, p));
}
function mustExist(p, hint) {
  if (!fs.existsSync(p)) {
    console.error(`✖ ${p} not found. ${hint}`);
    process.exit(1);
  }
}

const schemaPath = path.join(backendDir, "prisma", "schema.prisma");
const registryPath = path.join(backendDir, "src", "config", "permissionRegistry.ts");
const routesPath = path.join(backendDir, "src", "routes", "index.routes.ts");
mustExist(schemaPath, "Pass the sunsea backend folder as the first argument.");
mustExist(registryPath, "");
mustExist(routesPath, "");

// 1 + 2 — Prisma schema
{
  let schema = read(schemaPath);
  const MARK = "// SUN SEA ERP — Mobile (Sales Executive) app models";
  if (!schema.includes(MARK)) {
    schema = schema.trimEnd() + "\n\n" + read(path.join(extDir, "prisma", "mobile-models.prisma"));
  }
  const addFieldToModel = (model, line) => {
    if (schema.includes(line.trim())) return;
    const re = new RegExp(`(model\\s+${model}\\s*\\{[^\\n]*\\n)`);
    if (!re.test(schema)) {
      console.error(`✖ model ${model} not found in schema.prisma`);
      process.exit(1);
    }
    schema = schema.replace(re, `$1${line}\n`);
  };
  addFieldToModel("Customer", "  mobileVisits         MobileVisit[]");
  addFieldToModel("Customer", "  mobileCollections    MobileCollection[]");
  addFieldToModel("Customer", "  mobileRouteCustomers MobileRouteCustomer[]");
  addFieldToModel("Route", "  mobileVisits      MobileVisit[]");
  addFieldToModel("Route", "  mobileCustomers   MobileRouteCustomer[]");
  addFieldToModel("Route", "  mobileAssignments MobileRouteAssignment[]");
  write(schemaPath, schema);
}

// 3 — permission registry
{
  let reg = read(registryPath);
  if (!reg.includes('module: "mobile-app"')) {
    const entry =
      '\n  // ── Mobile (Sales Executive) App ──────────────────────────────────────────\n' +
      '  { module: "mobile-app", actions: ["view","create","manage"], description: "Sales Executive Mobile App" },\n';
    reg = reg.replace(/(\n\];)/, entry + "$1");
    write(registryPath, reg);
  } else {
    console.log("  permission registry already contains mobile-app");
  }
}

// 4 — router mount
{
  let routes = read(routesPath);
  if (!routes.includes("mobile.routes")) {
    routes = routes.replace(
      /(import categoryRoutes[^\n]*\n)/,
      '$1import mobileRoutes from "../modules/mobile/mobile.routes";\n'
    );
    routes = routes.replace(
      /(router\.use\("\/categories", categoryRoutes\);\n)/,
      '$1router.use("/mobile", mobileRoutes);\n'
    );
    if (!routes.includes('router.use("/mobile"')) {
      console.error("✖ could not find the categories router mount to anchor on — add `router.use(\"/mobile\", mobileRoutes)` manually");
      process.exit(1);
    }
    write(routesPath, routes);
  } else {
    console.log("  routes already mount /mobile");
  }
}

// 5 — module files
{
  const src = path.join(extDir, "src", "modules", "mobile");
  const dest = path.join(backendDir, "src", "modules", "mobile");
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
  }
  console.log("  copied src/modules/mobile (" + fs.readdirSync(src).length + " files)");
}

console.log(`
✔ Mobile module applied. Next:
   cd ${backendDir}
   npm install @anthropic-ai/sdk            # cheque OCR (optional: @aws-sdk/client-s3 for S3 storage)
   npx prisma migrate dev --name mobile_app # or: npx prisma db push
   npx prisma generate
   npm run dev
`);
