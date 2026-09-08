import { z } from "zod";

export const positionSchema = z.object({
  clientId: z.string().min(8).max(36),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyM: z.coerce.number().min(0).max(100000).nullable().optional(),
  speedKmh: z.coerce.number().min(0).max(400).nullable().optional(),
  heading: z.coerce.number().min(0).max(360).nullable().optional(),
  batteryPct: z.coerce.number().int().min(0).max(100).nullable().optional(),
  source: z.enum(["PING", "DAY_START", "DAY_END", "CHECK_IN", "CHECK_OUT"]).default("PING"),
  visitId: z.string().max(36).nullable().optional(),
  customerId: z.string().max(36).nullable().optional(),
  recordedAt: z.coerce.number().int().positive(), // epoch ms from the device
});

export const pushPositionsSchema = z.object({
  positions: z.array(positionSchema).min(1).max(500),
});
export type PositionInput = z.infer<typeof positionSchema>;

/** What the wall display and the Insights app consume. */
export interface AgentLiveStatus {
  id: string;
  name: string;
  initials: string;
  phone: string | null;
  area: string;
  city: string;
  lat: number;
  lng: number;
  accuracyM: number | null;
  speedKmH: number;
  heading: number | null;
  battery: number | null;
  status: "active" | "in_meeting" | "transit" | "idle";
  lastSeenAt: string;
  minutesAgo: number;
  source: string;
  todayOrdersCount: number;
  todaySalesValue: number;
  targetVisits: number;
  completedVisits: number;
  currentCustomer: string | null;
}
