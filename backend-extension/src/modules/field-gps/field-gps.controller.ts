import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { fieldGpsService } from "./field-gps.service";
import { pushPositionsSchema } from "./field-gps.types";

export const fieldGpsController = {
  /** POST /api/field/positions — the agent's phone reports where it is. */
  push: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId as string | undefined;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const parsed = pushPositionsSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(", "));
    const accepted = await fieldGpsService.record(userId, parsed.data.positions);
    // Wake the wall display without a poll.
    try {
      const { getIO } = require("../../socket/socket");
      const me = (await fieldGpsService.latest()).find((a) => a.id === userId);
      if (me) getIO().emit("field:position", me);
    } catch {
      /* socket not initialised (tests, scripts) */
    }
    return res.status(200).json(new ApiResponse("Positions recorded", { accepted, received: parsed.data.positions.length }));
  }),

  /** GET /api/field/positions/latest — everyone's last known position. */
  latest: asyncHandler(async (req: Request, res: Response) => {
    const hours = req.query.hours ? Math.min(72, Math.max(1, Number(req.query.hours))) : 14;
    const agents = await fieldGpsService.latest(hours);
    return res.status(200).json(new ApiResponse("Field positions", { live: true, generatedAt: new Date().toISOString(), agents }));
  }),

  /** GET /api/field/positions/:agentUserId/trail?date=YYYY-MM-DD */
  trail: asyncHandler(async (req: Request, res: Response) => {
    const points = await fieldGpsService.trail(String(req.params.agentUserId), req.query.date ? String(req.query.date) : undefined);
    return res.status(200).json(new ApiResponse("Trail", { points }));
  }),
};
