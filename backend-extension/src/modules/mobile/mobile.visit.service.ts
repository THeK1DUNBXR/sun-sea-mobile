/**
 * Route planning + visits.
 *  - Agents create/update visits on the device (pushed via sync).
 *  - The office plans visits from the web (admin endpoints) or, when nothing
 *    is planned for a day, visits are auto-generated from the route(s)
 *    assigned to the agent for that weekday.
 */
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { AgentContext, VisitRaw } from "./mobile.types";

const dateOnly = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
const todayYmd = (offsetDays = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

class MobileVisitService {
  /** Device → server. Only the owning agent may change a visit. */
  async upsertFromDevice(agent: AgentContext, raw: VisitRaw) {
    const agentId = agent.userId.slice(0, 36);
    const existing = await prisma.mobileVisit.findUnique({ where: { id: raw.id } });
    if (existing && existing.agentUserId !== agentId && !agent.isSuperAdmin) {
      throw new ApiError(403, `Visit ${raw.id} belongs to another agent`);
    }
    const data = {
      customerId: raw.customer_id,
      routeId: raw.route_id ?? null,
      plannedDate: dateOnly(raw.planned_date),
      plannedTime: raw.planned_time ?? null,
      sequence: raw.sequence ?? 0,
      status: raw.status,
      outcome: raw.outcome ?? null,
      checkInAt: raw.check_in_at ? new Date(raw.check_in_at) : null,
      checkOutAt: raw.check_out_at ? new Date(raw.check_out_at) : null,
      latitude: raw.latitude == null ? null : new Prisma.Decimal(raw.latitude),
      longitude: raw.longitude == null ? null : new Prisma.Decimal(raw.longitude),
      notes: raw.notes ?? null,
      deletedAt: null,
    };
    return prisma.mobileVisit.upsert({
      where: { id: raw.id },
      create: { id: raw.id, agentUserId: existing?.agentUserId ?? agentId, ...data },
      update: data,
    });
  }

  async softDeleteFromDevice(agent: AgentContext, ids: string[]) {
    if (ids.length === 0) return;
    await prisma.mobileVisit.updateMany({
      where: { id: { in: ids }, agentUserId: agent.userId.slice(0, 36) },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * If the agent has no visits for a date but a route is assigned for that
   * weekday, materialise the route into visits (once).
   */
  async ensureAutoPlanned(agentUserId: string, dates: string[] = [todayYmd(0), todayYmd(1)]) {
    const agentId = agentUserId.slice(0, 36);
    const assignments = await prisma.mobileRouteAssignment.findMany({
      where: { agentUserId: agentId, isActive: true },
      include: { route: { include: { mobileCustomers: { orderBy: { sequence: "asc" } } } } },
    });
    if (assignments.length === 0) return;

    for (const ymd of dates) {
      const date = dateOnly(ymd);
      const dow = date.getUTCDay();
      const todays = assignments.filter((a) => a.dayOfWeek === null || a.dayOfWeek === dow);
      if (todays.length === 0) continue;

      const count = await prisma.mobileVisit.count({
        where: { agentUserId: agentId, plannedDate: date, deletedAt: null },
      });
      if (count > 0) continue;

      const rows: Prisma.MobileVisitCreateManyInput[] = [];
      const seen = new Set<string>();
      let seq = 0;
      for (const a of todays) {
        for (const rc of a.route.mobileCustomers) {
          if (seen.has(rc.customerId)) continue;
          seen.add(rc.customerId);
          rows.push({
            id: crypto.randomUUID(),
            agentUserId: agentId,
            customerId: rc.customerId,
            routeId: a.routeId,
            plannedDate: date,
            plannedTime: rc.plannedTime ?? null,
            sequence: rc.sequence || ++seq,
            status: "PLANNED",
          });
        }
      }
      if (rows.length > 0) await prisma.mobileVisit.createMany({ data: rows, skipDuplicates: true });
    }
  }

  // ─── Office / admin ────────────────────────────────────────────────────────

  async listRoutes() {
    return prisma.route.findMany({
      orderBy: { routeCode: "asc" },
      include: {
        mobileCustomers: {
          orderBy: { sequence: "asc" },
          include: { customer: { select: { id: true, customerCode: true, firmName: true, status: true } } },
        },
        mobileAssignments: true,
      },
    });
  }

  async createRoute(data: { routeCode: string; routeName: string }) {
    return prisma.route.create({ data });
  }

  async setRouteCustomers(
    routeId: string,
    customers: { customerId: string; sequence: number; plannedTime?: string | null }[]
  ) {
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) throw new ApiError(404, "Route not found");
    await prisma.$transaction([
      prisma.mobileRouteCustomer.deleteMany({ where: { routeId } }),
      prisma.mobileRouteCustomer.createMany({
        data: customers.map((c, idx) => ({
          routeId,
          customerId: c.customerId,
          sequence: c.sequence ?? idx + 1,
          plannedTime: c.plannedTime ?? null,
        })),
        skipDuplicates: true,
      }),
    ]);
    return prisma.mobileRouteCustomer.findMany({ where: { routeId }, orderBy: { sequence: "asc" } });
  }

  async setRouteAssignments(routeId: string, assignments: { agentUserId: string; dayOfWeek?: number | null }[]) {
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) throw new ApiError(404, "Route not found");
    await prisma.$transaction([
      prisma.mobileRouteAssignment.deleteMany({ where: { routeId } }),
      prisma.mobileRouteAssignment.createMany({
        data: assignments.map((a) => ({
          routeId,
          agentUserId: a.agentUserId.slice(0, 36),
          dayOfWeek: a.dayOfWeek ?? null,
        })),
      }),
    ]);
    return prisma.mobileRouteAssignment.findMany({ where: { routeId } });
  }

  async planVisits(input: {
    agentUserId: string;
    plannedDate: string;
    visits: { customerId: string; plannedTime?: string | null; sequence?: number; notes?: string | null }[];
  }) {
    const date = dateOnly(input.plannedDate);
    const agentId = input.agentUserId.slice(0, 36);
    const existing = await prisma.mobileVisit.findMany({
      where: { agentUserId: agentId, plannedDate: date, deletedAt: null },
      select: { customerId: true, sequence: true },
    });
    const have = new Set(existing.map((e) => e.customerId));
    let seq = existing.reduce((m, e) => Math.max(m, e.sequence), 0);
    const rows = input.visits
      .filter((v) => !have.has(v.customerId))
      .map((v) => ({
        id: crypto.randomUUID(),
        agentUserId: agentId,
        customerId: v.customerId,
        plannedDate: date,
        plannedTime: v.plannedTime ?? null,
        sequence: v.sequence ?? ++seq,
        notes: v.notes ?? null,
        status: "PLANNED",
      }));
    if (rows.length > 0) await prisma.mobileVisit.createMany({ data: rows });
    return prisma.mobileVisit.findMany({
      where: { agentUserId: agentId, plannedDate: date, deletedAt: null },
      orderBy: [{ sequence: "asc" }, { plannedTime: "asc" }],
      include: { customer: { select: { id: true, customerCode: true, firmName: true } } },
    });
  }

  async listVisits(q: { agentUserId?: string; date?: string; from?: string; to?: string }) {
    const where: Prisma.MobileVisitWhereInput = { deletedAt: null };
    if (q.agentUserId) where.agentUserId = q.agentUserId.slice(0, 36);
    if (q.date) where.plannedDate = dateOnly(q.date);
    else if (q.from || q.to) {
      where.plannedDate = {
        ...(q.from ? { gte: dateOnly(q.from) } : {}),
        ...(q.to ? { lte: dateOnly(q.to) } : {}),
      };
    }
    return prisma.mobileVisit.findMany({
      where,
      orderBy: [{ plannedDate: "asc" }, { sequence: "asc" }],
      include: {
        customer: { select: { id: true, customerCode: true, firmName: true, displayName: true } },
        route: { select: { id: true, routeCode: true, routeName: true } },
      },
    });
  }

  /** Users whose role grants the mobile app permission (the field team). */
  async listAgents() {
    const users = await prisma.user.findMany({
      where: {
        status: "active",
        role: { rolePermissions: { some: { permission: { key: "mobile-app.view" } } } },
      },
      select: {
        userId: true,
        fullName: true,
        email: true,
        username: true,
        employeeId: true,
        role: { select: { name: true } },
        employee: { select: { empCode: true, mobile: true } },
      },
      orderBy: { fullName: "asc" },
    });
    return users;
  }
}

export const mobileVisitService = new MobileVisitService();
