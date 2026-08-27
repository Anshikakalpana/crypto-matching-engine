
import type { OrderStatus } from "@cme/shared";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PARTIALLY_FILLED", "FILLED", "CANCELLED"],
  PARTIALLY_FILLED: ["PARTIALLY_FILLED", "FILLED", "CANCELLED"],
  FILLED: [],
  CANCELLED: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Invalid order status transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertValidTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) return; // no-op transitions are harmless
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}
