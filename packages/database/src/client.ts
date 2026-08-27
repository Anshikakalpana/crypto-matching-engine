import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    const connectionString =
      process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/matching_engine";
    const pool = new Pool({ connectionString });
    db = drizzle(pool, { schema });
  }
  return db;
}
