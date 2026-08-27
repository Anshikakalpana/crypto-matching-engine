import { describe, it, expect } from "vitest";
import { MatchingEngine } from "@cme/engine/src/matching-engine";
import type { Order } from "@cme/shared";

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: crypto.randomUUID(),
    clientOrderId: crypto.randomUUID(),
    side: "BUY",
    price: 100,
    quantity: 1,
    remainingQuantity: 1,
    status: "PENDING",
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("MatchingEngine concurrency", () => {
  it("handles many simultaneous orders at the same price without losing or double-matching quantity", async () => {
    const engine = new MatchingEngine();

    // Rest 50 sell orders of 1 unit each at price 100 — total liquidity: 50 units
    const sellOrders = Array.from({ length: 50 }, () =>
      makeOrder({ side: "SELL", price: 100, quantity: 1, remainingQuantity: 1 })
    );
    for (const sell of sellOrders) {
      engine.submitOrder(sell);
    }

    // Fire 50 buy orders "simultaneously" via Promise.all
    const buyOrders = Array.from({ length: 50 }, () =>
      makeOrder({ side: "BUY", price: 100, quantity: 1, remainingQuantity: 1 })
    );
    const results = await Promise.all(
      buyOrders.map((buy) => Promise.resolve(engine.submitOrder(buy)))
    );

    // Every buy order should have fully matched exactly one unit
    const allTrades = results.flatMap((r) => r.trades);
    expect(allTrades).toHaveLength(50);

    // No sell order should have been matched twice
    const sellOrderIdsMatched = allTrades.map((t) => t.sellOrderId);
    const uniqueSellOrderIds = new Set(sellOrderIdsMatched);
    expect(uniqueSellOrderIds.size).toBe(50); // every sell matched exactly once, none double-matched

    // Total traded quantity should equal exactly the liquidity available — nothing lost, nothing duplicated
    const totalTradedQuantity = allTrades.reduce((sum, t) => sum + t.quantity, 0);
    expect(totalTradedQuantity).toBe(50);
  });
});
