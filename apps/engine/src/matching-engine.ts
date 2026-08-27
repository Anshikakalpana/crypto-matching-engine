import type { Order, Trade } from "@cme/shared";
import { OrderBook } from "./order-book";
import { assertValidTransition } from "./order-state-machine";

export interface MatchResult {
  updatedOrder: Order;
  trades: Trade[];
}

export class MatchingEngine {
  private book = new OrderBook();

  submitOrder(order: Order): MatchResult {
    const trades: Trade[] = [];
    let incoming = { ...order };

    const isBuy = incoming.side === "BUY";

    while (incoming.remainingQuantity > 0) {
      const bestOppositePrice = isBuy ? this.book.bestAsk() : this.book.bestBid();
      if (bestOppositePrice === undefined) break;

      const pricesCross = isBuy
        ? incoming.price >= bestOppositePrice
        : incoming.price <= bestOppositePrice;
      if (!pricesCross) break;

      const level = isBuy
        ? this.book.getAskLevel(bestOppositePrice)
        : this.book.getBidLevel(bestOppositePrice);
      if (!level) break;

      const resting = level.peekFront();
      if (!resting) break;

      const matchQuantity = Math.min(incoming.remainingQuantity, resting.remainingQuantity);
      const executionPrice = resting.price; // maker's price wins

      trades.push({
        id: crypto.randomUUID(),
        buyOrderId: isBuy ? incoming.id : resting.id,
        sellOrderId: isBuy ? resting.id : incoming.id,
        price: executionPrice,
        quantity: matchQuantity,
        executedAt: Date.now(),
      });

      incoming.remainingQuantity -= matchQuantity;
      resting.remainingQuantity -= matchQuantity;

      if (resting.remainingQuantity === 0) {
        assertValidTransition(resting.status, "FILLED");
        resting.status = "FILLED";
        level.removeFront();
        this.book.removeOrder(resting.id);
      } else {
        assertValidTransition(resting.status, "PARTIALLY_FILLED");
        resting.status = "PARTIALLY_FILLED";
      }
    }

    if (incoming.remainingQuantity === 0) {
      assertValidTransition(incoming.status, "FILLED");
      incoming.status = "FILLED";
    } else if (incoming.remainingQuantity < incoming.quantity) {
      assertValidTransition(incoming.status, "PARTIALLY_FILLED");
      incoming.status = "PARTIALLY_FILLED";
      this.book.addOrder(incoming);
    } else {
      this.book.addOrder(incoming);
    }

    return { updatedOrder: incoming, trades };
  }

  cancelOrder(orderId: string): boolean {
    return this.book.removeOrder(orderId);
  }
}
