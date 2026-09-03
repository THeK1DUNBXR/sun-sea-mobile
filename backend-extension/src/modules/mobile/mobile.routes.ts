/**
 * /api/mobile — endpoints used by the Sun Sea Field (sales executive) app.
 *
 * Permissions (auto-registered via permissionRegistry):
 *   mobile-app.view    – read: bootstrap, pull, customer statement
 *   mobile-app.create  – write: push, attachments, cheque OCR
 *   mobile-app.manage  – office: routes, planning, collections register
 */
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { uploadMobileAttachment } from "./mobile.attachment.service";
import { mobileController } from "./mobile.controller";

const router = Router();

router.use(authMiddleware);

// ─── Device ──────────────────────────────────────────────────────────────────
router.get("/bootstrap", requirePermission("mobile-app.view"), mobileController.bootstrap);
router.get("/sync/pull", requirePermission("mobile-app.view"), mobileController.pull);
router.post("/sync/push", requirePermission("mobile-app.create"), mobileController.push);
router.post(
  "/attachments",
  requirePermission("mobile-app.create"),
  uploadMobileAttachment.single("file"),
  mobileController.uploadAttachment
);
router.post(
  "/ocr/cheque",
  requirePermission("mobile-app.create"),
  uploadMobileAttachment.single("image"),
  mobileController.chequeOcr
);
router.get("/customers/:id/statement", requirePermission("mobile-app.view"), mobileController.customerStatement);

// ─── Office / admin ──────────────────────────────────────────────────────────
router.get("/admin/agents", requirePermission("mobile-app.manage"), mobileController.listAgents);
router.get("/admin/routes", requirePermission("mobile-app.manage"), mobileController.listRoutes);
router.post("/admin/routes", requirePermission("mobile-app.manage"), mobileController.createRoute);
router.put("/admin/routes/:id/customers", requirePermission("mobile-app.manage"), mobileController.setRouteCustomers);
router.put("/admin/routes/:id/assignments", requirePermission("mobile-app.manage"), mobileController.setRouteAssignments);
router.get("/admin/visits", requirePermission("mobile-app.manage"), mobileController.listVisits);
router.post("/admin/visits", requirePermission("mobile-app.manage"), mobileController.planVisits);
router.get("/admin/collections", requirePermission("mobile-app.manage"), mobileController.listCollections);
router.post("/admin/collections/:id/repost", requirePermission("mobile-app.manage"), mobileController.repostCollection);

export default router;
