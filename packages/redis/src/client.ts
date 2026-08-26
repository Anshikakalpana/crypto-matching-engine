import Redis from "ioredis";
import { join } from "node:path";

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    client = new Redis(url);

    client.defineCommand("checkIdempotency", {
      numberOfKeys: 1,
      lua: require("node:fs").readFileSync(
        join(__dirname, "lua/idempotency-check.lua"),
        "utf-8"
      ),
    });

    client.defineCommand("checkRateLimit", {
      numberOfKeys: 1,
      lua: require("node:fs").readFileSync(
        join(__dirname, "lua/rate-limit-token-bucket.lua"),
        "utf-8"
      ),
    });
  }
  return client;
}

declare module "ioredis" {
  interface RedisCommander<Context> {
    checkIdempotency(key: string, orderId: string, ttlSeconds: string): Promise<string | null>;
    checkRateLimit(
      key: string,
      capacity: string,
      refillRate: string,
      now: string,
      requested: string
    ): Promise<number>;
  }
}
