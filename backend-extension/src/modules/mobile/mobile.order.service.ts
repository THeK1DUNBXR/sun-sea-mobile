/**
 * Creates ERP Sales Orders from orders captured on the mobile app.
 * Delegates to the existing sales-order service so pricing (grade rates),
 * GST and the order workflow behave exactly as they do in the web app.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import salesOrderService from "../sales-order/sales-order.service";
import { createSalesOrderSchema } from "../sales-order/sales-order.validation";
import { AgentContext, OrderRaw } from "./mobile.types";

const ORDER_STATUS = (process.env.MOBILE_ORDER_STATUS || "DRAFT").toUpperCase();

function emit(event: string, payload: unknown) {
  try {
    const { getIO } = require("../../socket/socket");
    getIO().emit(event, payload);
  } catch {
    /* ignore */
  }
}

class MobileOrderService {
  async create(agent: AgentContext, raw: OrderRaw) {
    const existing = await prisma.mobileSyncRecord.findUnique({ where: { clientId: raw.id } });
    if (existing?.serverId) {
      return prisma.salesOrder.findUnique({ where: { id: Number(existing.serverId) } });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: raw.customer_id },
      select: { id: true, mobile: true, deletedAt: true, status: true },
    });
    if (!customer || customer.deletedAt) throw new ApiError(404, "Customer not found");
    if (customer.status === "Blocked") throw new ApiError(400, "Customer is blocked — order not accepted");

    // Merge duplicate product lines (the ERP rejects duplicates).
    const merged = new Map<string, { productId: string; quantity: number; unitPrice?: number | null }>();
    for (const item of raw.items) {
      const key = String(item.productId);
      const prev = merged.get(key);
      if (prev) prev.quantity += item.quantity;
      else merged.set(key, { productId: key, quantity: item.quantity, unitPrice: item.unitPrice ?? undefined });
    }

    // `createdBy` must reference a real users.user_id row; super-admin tokens use a virtual id.
    const createdBy = agent.isSuperAdmin ? undefined : agent.userId;

    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const orderNo = await salesOrderService.getNextSalesOrderCode();
      const body = {
        orderNo,
        orderDate: raw.order_date,
        customerId: raw.customer_id,
        mobile: null,
        orderType: "salesperson",
        salesPersonName: agent.fullName || agent.email || agent.userId,
        orderSource: "SALES_PERSON",
        sourceEmployeeId: agent.employeeId ? agent.employeeId.toString() : null,
        status: ORDER_STATUS,
        narration: raw.remarks ? `${raw.remarks} (mobile order ${raw.id.slice(0, 8)})` : `Mobile order ${raw.id.slice(0, 8)}`,
        createdBy,
        items: [...merged.values()].map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          // Only pass a manual price when the agent deliberately overrode it;
          // otherwise the ERP applies the customer-grade price list.
          unitPrice: i.unitPrice && i.unitPrice > 0 ? i.unitPrice : undefined,
        })),
      };

      try {
        const parsed = createSalesOrderSchema.parse({ body }).body;
        const order = await salesOrderService.create(parsed, agent.permissions);
        await prisma.mobileSyncRecord.upsert({
          where: { clientId: raw.id },
          create: {
            clientId: raw.id,
            entityType: "ORDER",
            serverId: String(order.id),
            agentUserId: agent.userId.slice(0, 36),
            status: "OK",
            payload: { ...raw, total_amount: Number(order.netAmount) } as unknown as Prisma.InputJsonValue,
          },
          update: { serverId: String(order.id), status: "OK", error: null },
        });
        if (raw.visit_id) {
          const visit = await prisma.mobileVisit.findUnique({ where: { id: raw.visit_id } });
          if (visit && visit.agentUserId === agent.userId.slice(0, 36)) {
            await prisma.mobileVisit.update({
              where: { id: visit.id },
              data: { outcome: visit.outcome === "COLLECTION" ? "BOTH" : "ORDER" },
            });
          }
        }
        emit("salesOrder:created", order);
        return order;
      } catch (err: any) {
        lastErr = err;
        // Order number collision with a concurrent web/mobile order — regenerate.
        if (err instanceof ApiError && err.statusCode === 409) continue;
        if (err?.code === "P2002") continue;
        throw err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new ApiError(500, "Could not allocate an order number");
  }

  async recordFailure(agent: AgentContext, raw: OrderRaw, error: string) {
    await prisma.mobileSyncRecord.upsert({
      where: { clientId: raw.id },
      create: {
        clientId: raw.id,
        entityType: "ORDER",
        agentUserId: agent.userId.slice(0, 36),
        status: "FAILED",
        error: error.slice(0, 500),
        payload: raw as unknown as Prisma.InputJsonValue,
      },
      update: { status: "FAILED", error: error.slice(0, 500), payload: raw as unknown as Prisma.InputJsonValue },
    });
  }
}

export const mobileOrderService = new MobileOrderService();
