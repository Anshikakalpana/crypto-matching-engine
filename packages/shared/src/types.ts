import { z } from "zod";

export const SideSchema = z.enum(["BUY", "SELL"]);

export type Side = z.infer<typeof SideSchema>;

export const OrderStatusSchema = z.enum([
  "PENDING",
  "PARTIALLY_FILLED",
  "FILLED",
  "CANCELLED",
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  clientOrderId: z.string(),
  side: SideSchema,
  price: z.number().int().positive(),
  quantity: z.number().int().positive(),
  remainingQuantity: z.number().int().nonnegative(),
  status: OrderStatusSchema,
  createdAt: z.number().int(),
});

export type Order = z.infer<typeof OrderSchema>;

export const TradeSchema = z.object({
  id: z.string(),
  buyOrderId: z.string(),
  sellOrderId: z.string(),
  price: z.number().int().positive(),
  quantity: z.number().int().positive(),
  executedAt: z.number().int(),
});
export type Trade = z.infer<typeof TradeSchema>;

export const PlaceOrderRequestSchema = z.object({
  clientOrderId: z.string(),
  side: SideSchema,
  price: z.number().int().positive(),
  quantity: z.number().int().positive(),
});
export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequestSchema>;
