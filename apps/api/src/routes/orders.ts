import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { MatchingEngine } from "@cme/engine/src/matching-engine";
import { PlaceOrderRequestSchema, type Order } from "@cme/shared";
import { getDb, orders as ordersTable, trades as tradesTable } from "@cme/database";
import { getRedisClient } from "@cme/redis";
import { idempotencyMiddleware } from "../middleware/idempotency";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";

export const ordersRouter: Router = Router();

// Single shared engine instance for the whole process — this IS the order book.
const engine = new MatchingEngine();

ordersRouter.post("/orders", idempotencyMiddleware, async (req: Request, res: Response) => {
  const key = (req as any).idempotencyKey as string;
  const redis = getRedisClient();

  const parseResult = PlaceOrderRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    const body = { error: "Invalid order", details: parseResult.error.flatten() };
    await redis.completeIdempotency(key, JSON.stringify({ status: "completed", httpStatus: 400, body }), "86400");
    res.status(400).json(body);
    return;
  }

  const request = parseResult.data;

  const order: Order = {
    id: randomUUID(),
    clientOrderId: request.clientOrderId,
    side: request.side,
    price: request.price,
    quantity: request.quantity,
    remainingQuantity: request.quantity,
    status: "PENDING",
    createdAt: Date.now(),
  };

  try {
    const result = engine.submitOrder(order);
    const db = getDb();

    await db.transaction(async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
      await tx.insert(ordersTable).values({
        id: result.updatedOrder.id,
        clientOrderId: result.updatedOrder.clientOrderId,
        side: result.updatedOrder.side,
        price: result.updatedOrder.price,
        quantity: result.updatedOrder.quantity,
        remainingQuantity: result.updatedOrder.remainingQuantity,
        status: result.updatedOrder.status,
        createdAt: new Date(result.updatedOrder.createdAt),
      });

      if (result.trades.length > 0) {
        await tx.insert(tradesTable).values(
          result.trades.map((t) => ({
            id: t.id,
            buyOrderId: t.buyOrderId,
            sellOrderId: t.sellOrderId,
            price: t.price,
            quantity: t.quantity,
            executedAt: new Date(t.executedAt),
          }))
        );
      }
    });

    const body = { order: result.updatedOrder, trades: result.trades };
    await redis.completeIdempotency(
      key,
      JSON.stringify({ status: "completed", httpStatus: 201, body }),
      "86400"
    );
    res.status(201).json(body);
  } catch (err) {
    // Processing failed — release the idempotency claim so a retry can genuinely try again,
    // rather than being stuck believing this is "still processing" for the full TTL.
    await redis.releaseIdempotency(key);
    console.error("Order processing failed:", err);
    res.status(500).json({ error: "Internal error processing order" });
  }
});