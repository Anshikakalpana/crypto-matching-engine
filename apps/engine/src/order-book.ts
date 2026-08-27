import type { Order } from "@cme/shared";
import { PriceLevel } from "./price-level";

export class OrderBook {
  private bids: Map<number, PriceLevel> = new Map();
  private asks: Map<number, PriceLevel> = new Map();
  private orderLocations: Map<string, { side: "BUY" | "SELL"; price: number }> = new Map();

  addOrder(order: Order): void {
    const book = order.side === "BUY" ? this.bids : this.asks;

    let level = book.get(order.price);
    if (!level) {
      level = new PriceLevel(order.price);
      book.set(order.price, level);
    }
    level.addOrder(order);
    this.orderLocations.set(order.id, { side: order.side, price: order.price });
  }

  removeOrder(orderId: string): boolean {
    const location = this.orderLocations.get(orderId);
    if (!location) return false;

    const book = location.side === "BUY" ? this.bids : this.asks;
    const level = book.get(location.price);
    if (!level) return false;

    const removed = level.removeOrder(orderId);
    if (removed && level.isEmpty) {
      book.delete(location.price);
    }
    if (removed) {
      this.orderLocations.delete(orderId);
    }
    return removed;
  }

  bestBid(): number | undefined {
    if (this.bids.size === 0) return undefined;
    return Math.max(...this.bids.keys());
  }

  bestAsk(): number | undefined {
    if (this.asks.size === 0) return undefined;
    return Math.min(...this.asks.keys());
  }

  getBidLevel(price: number): PriceLevel | undefined {
    return this.bids.get(price);
  }

  getAskLevel(price: number): PriceLevel | undefined {
    return this.asks.get(price);
  }
}
