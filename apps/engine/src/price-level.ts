
import type { Order } from "@cme/shared";

export class PriceLevel {
  readonly price: number;
  private orders: Order[] = [];

  constructor(price: number) {
    this.price = price;
  }

  get totalQuantity(): number {
    return this.orders.reduce((sum, order) => sum + order.remainingQuantity, 0);
  }

  get isEmpty(): boolean {
    return this.orders.length === 0;
  }

  addOrder(order: Order): void {
    this.orders.push(order);
  }

  peekFront(): Order | undefined {
    return this.orders[0];
  }

  removeFront(): Order | undefined {
    return this.orders.shift();
  }

  removeOrder(orderId: string): boolean {
    const index = this.orders.findIndex((o) => o.id === orderId);
    if (index === -1) return false;
    this.orders.splice(index, 1);
    return true;
  }
}
