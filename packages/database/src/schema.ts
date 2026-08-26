import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    clientOrderId: text("client_order_id").notNull().unique(),
    side: text("side").notNull(), // "BUY" | "SELL"
    price: integer("price").notNull(),
    quantity: integer("quantity").notNull(),
    remainingQuantity: integer("remaining_quantity").notNull(),
    status: text("status").notNull(), // "PENDING" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED"
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("orders_status_idx").on(table.status),
    createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
  })
);

export const trades = pgTable("trades", {
  id: text("id").primaryKey(),
  buyOrderId: text("buy_order_id")
    .notNull()
    .references(() => orders.id),
  sellOrderId: text("sell_order_id")
    .notNull()
    .references(() => orders.id),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull(),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
});
