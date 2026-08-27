import { describe, it, expect, beforeEach } from "vitest";
import { MatchingEngine } from "../src/matching-engine";
import type { Order } from "@cme/shared";

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: crypto.randomUUID(),
    clientOrderId: crypto.randomUUID(),
    side: "BUY",
    price: 100,
    quantity: 10,
    remainingQuantity: 10,
    status: "PENDING",
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("MatchingEngine", () => {
  let engine: MatchingEngine;

  beforeEach(() => {
    engine = new MatchingEngine();
  });

  it("rests an order on the book when there's nothing to match against", () => {
    const order = makeOrder({ side: "BUY", price: 100, quantity: 10, remainingQuantity: 10 });
    const result = engine.submitOrder(order);

    expect(result.trades).toHaveLength(0);
    expect(result.updatedOrder.status).toBe("PENDING");
    expect(result.updatedOrder.remainingQuantity).toBe(10);
  });

  it("fully fills a matching order at the maker's price", () => {
    const sell = makeOrder({ side: "SELL", price: 100, quantity: 10, remainingQuantity: 10 });
    engine.submitOrder(sell);

    const buy = makeOrder({ side: "BUY", price: 105, quantity: 10, remainingQuantity: 10 });
    const result = engine.submitOrder(buy);

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].price).toBe(100); // maker's price, not taker's 105
    expect(result.trades[0].quantity).toBe(10);
    expect(result.updatedOrder.status).toBe("FILLED");
    expect(result.updatedOrder.remainingQuantity).toBe(0);
  });

  it("partially fills when incoming quantity exceeds resting quantity", () => {
    const sell = makeOrder({ side: "SELL", price: 100, quantity: 5, remainingQuantity: 5 });
    engine.submitOrder(sell);

    const buy = makeOrder({ side: "BUY", price: 100, quantity: 10, remainingQuantity: 10 });
    const result = engine.submitOrder(buy);

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].quantity).toBe(5);
    expect(result.updatedOrder.status).toBe("PARTIALLY_FILLED");
    expect(result.updatedOrder.remainingQuantity).toBe(5);
  });

  it("does not match when prices don't cross", () => {
    const sell = makeOrder({ side: "SELL", price: 105, quantity: 10, remainingQuantity: 10 });
    engine.submitOrder(sell);

    const buy = makeOrder({ side: "BUY", price: 100, quantity: 10, remainingQuantity: 10 });
    const result = engine.submitOrder(buy);

    expect(result.trades).toHaveLength(0);
    expect(result.updatedOrder.status).toBe("PENDING");
  });

  it("respects time priority: earlier resting order at the same price fills first", () => {
    const firstSell = makeOrder({ id: "s1", side: "SELL", price: 100, quantity: 5, remainingQuantity: 5 });
    const secondSell = makeOrder({ id: "s2", side: "SELL", price: 100, quantity: 5, remainingQuantity: 5 });
    engine.submitOrder(firstSell);
    engine.submitOrder(secondSell);

    const buy = makeOrder({ side: "BUY", price: 100, quantity: 5, remainingQuantity: 5 });
    const result = engine.submitOrder(buy);

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].sellOrderId).toBe("s1"); // the first one resting, not s2
  });

  it("cancels a resting order successfully", () => {
    const order = makeOrder({ side: "BUY", price: 100, quantity: 10, remainingQuantity: 10 });
    engine.submitOrder(order);

    const cancelled = engine.cancelOrder(order.id);
    expect(cancelled).toBe(true);

    const sell = makeOrder({ side: "SELL", price: 100, quantity: 10, remainingQuantity: 10 });
    const result = engine.submitOrder(sell);
    expect(result.trades).toHaveLength(0); // nothing to match, the buy was cancelled
  });

  it("returns false when cancelling a non-existent order", () => {
    expect(engine.cancelOrder("nonexistent-id")).toBe(false);
  });
});
