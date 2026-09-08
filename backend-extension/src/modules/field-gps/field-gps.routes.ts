/**
 * /api/field — live location of sales agents.
 *
 *   POST /api/field/positions               phone → server (any logged-in user reports its own position)
 *   GET  /api/field/positions/latest        wall display / Insights (dashboard.view)
 *   GET  /api/field/positions/:id/trail     one agent's day as a polyline (dashboard.view)
 */
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireAnyPermission } from "../../middleware/permission.middleware";
import { fieldGpsController } from "./field-gps.controller";

const router = Router();
router.use(authMiddleware);

router.post("/positions", fieldGpsController.push);
router.get("/positions/latest", requireAnyPermission("dashboard.view", "mobile-app.manage"), fieldGpsController.latest);
router.get("/positions/:agentUserId/trail", requireAnyPermission("dashboard.view", "mobile-app.manage"), fieldGpsController.trail);

export default router;
