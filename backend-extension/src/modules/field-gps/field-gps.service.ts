/**
 * Field GPS — stores agents' position reports and answers "where is everyone"
 * for the TV dashboard's field-sales scene. Independent of the mobile sync
 * module: it works on a plain ERP, and enriches its answers (visit counts,
 * current customer) when the mobile module's tables exist.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AgentLiveStatus, PositionInput } from "./field-gps.types";

const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  if (v instanceof Prisma.Decimal) return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const db = prisma as any; // mobile* tables are optional — accessed dynamically

const STALE_MIN = 30;
const IDLE_SPEED_KMH = 5;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export const fieldGpsService = {
  /** Idempotent insert: clientId is unique, so a retried batch never duplicates. */
  async record(agentUserId: string, positions: PositionInput[]) {
    let accepted = 0;
    for (const p of positions) {
      try {
        await prisma.fieldAgentPosition.create({
          data: {
            clientId: p.clientId,
            agentUserId,
            latitude: new Prisma.Decimal(p.latitude.toFixed(7)),
            longitude: new Prisma.Decimal(p.longitude.toFixed(7)),
            accuracyM: p.accuracyM == null ? null : new Prisma.Decimal(p.accuracyM.toFixed(1)),
            speedKmh: p.speedKmh == null ? null : new Prisma.Decimal(p.speedKmh.toFixed(1)),
            heading: p.heading == null ? null : new Prisma.Decimal(p.heading.toFixed(1)),
            batteryPct: p.batteryPct ?? null,
            source: p.source,
            visitId: p.visitId ?? null,
            customerId: p.customerId ?? null,
            recordedAt: new Date(p.recordedAt),
          },
        });
        accepted += 1;
      } catch (e: any) {
        if (e?.code !== "P2002") throw e; // duplicate clientId → already stored
      }
    }
    return accepted;
  },

  /** Latest position per agent in the last `sinceHours`, with today's field figures where available. */
  async latest(sinceHours = 14): Promise<AgentLiveStatus[]> {
    const since = new Date(Date.now() - sinceHours * 3600_000);
    const rows = await prisma.fieldAgentPosition.findMany({
      where: { recordedAt: { gte: since } },
      orderBy: { recordedAt: "desc" },
      distinct: ["agentUserId"],
    });
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.agentUserId);
    const users = await prisma.user.findMany({ where: { userId: { in: ids } }, select: { userId: true, fullName: true, email: true } });
    const userById = new Map(users.map((u) => [u.userId, u]));

    // Optional enrichment from the mobile module.
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const visitsByAgent = new Map<string, { planned: number; done: number; current: string | null }>();
    const ordersByAgent = new Map<string, { count: number; value: number }>();
    if (db.mobileVisit && db.mobileOrder) {
      try {
        const visits = await db.mobileVisit.findMany({
          where: { agentUserId: { in: ids }, plannedDate: { gte: dayStart } },
          select: { agentUserId: true, status: true, customer: { select: { firmName: true, displayName: true } } },
        });
        for (const v of visits) {
          const cur = visitsByAgent.get(v.agentUserId) ?? { planned: 0, done: 0, current: null };
          if (v.status !== "SKIPPED") cur.planned += 1;
          if (v.status === "COMPLETED") cur.done += 1;
          if (v.status === "IN_PROGRESS") cur.current = v.customer?.displayName || v.customer?.firmName || null;
          visitsByAgent.set(v.agentUserId, cur);
        }
        const orders = await db.mobileOrder.findMany({
          where: { agentUserId: { in: ids }, createdAt: { gte: dayStart }, status: { not: "FAILED" } },
          select: { agentUserId: true, totalAmount: true },
        });
        for (const o of orders) {
          const cur = ordersByAgent.get(o.agentUserId) ?? { count: 0, value: 0 };
          cur.count += 1;
          cur.value += num(o.totalAmount);
          ordersByAgent.set(o.agentUserId, cur);
        }
      } catch {
        /* mobile tables absent or differently shaped — figures stay zero */
      }
    }

    // Last customer named in a check-in, for the "area" line when no visit table exists.
    const customerIds = rows.map((r) => r.customerId).filter(Boolean) as string[];
    const customers = customerIds.length
      ? await prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, firmName: true, displayName: true, addresses: { select: { address: true }, take: 1 } } })
      : [];
    const customerById = new Map(customers.map((c) => [c.id, c]));

    return rows.map((r) => {
      const u = userById.get(r.agentUserId);
      const name = u?.fullName ?? "Agent";
      const minutesAgo = Math.max(0, Math.round((Date.now() - r.recordedAt.getTime()) / 60_000));
      const speed = num(r.speedKmh);
      const v = visitsByAgent.get(r.agentUserId);
      const cust = r.customerId ? customerById.get(r.customerId) : undefined;
      const city = ((cust?.addresses?.[0]?.address as any)?.city as string | undefined) ?? "";
      const status: AgentLiveStatus["status"] =
        r.source === "DAY_END" || minutesAgo > STALE_MIN
          ? "idle"
          : v?.current || r.source === "CHECK_IN"
            ? "in_meeting"
            : speed > IDLE_SPEED_KMH
              ? "transit"
              : "active";
      const orders = ordersByAgent.get(r.agentUserId);
      return {
        id: r.agentUserId,
        name,
        initials: initials(name),
        phone: null,
        area: v?.current ?? cust?.displayName ?? cust?.firmName ?? (r.source === "DAY_END" ? "Day ended" : "On route"),
        city,
        lat: num(r.latitude),
        lng: num(r.longitude),
        accuracyM: r.accuracyM == null ? null : num(r.accuracyM),
        speedKmH: Math.round(speed),
        heading: r.heading == null ? null : num(r.heading),
        battery: r.batteryPct,
        status,
        lastSeenAt: r.recordedAt.toISOString(),
        minutesAgo,
        source: r.source,
        todayOrdersCount: orders?.count ?? 0,
        todaySalesValue: Math.round(orders?.value ?? 0),
        targetVisits: v?.planned ?? 0,
        completedVisits: v?.done ?? 0,
        currentCustomer: v?.current ?? null,
      };
    });
  },

  /** One agent's breadcrumb trail for a day (default today), oldest first. */
  async trail(agentUserId: string, date?: string) {
    const d = date ? new Date(date) : new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(start.getTime() + 86_400_000);
    const rows = await prisma.fieldAgentPosition.findMany({
      where: { agentUserId, recordedAt: { gte: start, lt: end } },
      orderBy: { recordedAt: "asc" },
      select: { latitude: true, longitude: true, recordedAt: true, source: true, speedKmh: true, customerId: true },
    });
    return rows.map((r) => ({ lat: num(r.latitude), lng: num(r.longitude), at: r.recordedAt.toISOString(), source: r.source, speedKmH: Math.round(num(r.speedKmh)), customerId: r.customerId }));
  },
};
