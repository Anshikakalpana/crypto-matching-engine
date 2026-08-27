import Redis from "ioredis";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    client = new Redis(url);

    client.defineCommand("checkIdempotency", {
      numberOfKeys: 1,
      lua: readFileSync(join(__dirname, "lua/idempotency-check.lua"), "utf-8"),
    });

    client.defineCommand("checkRateLimit", {
      numberOfKeys: 1,
      lua: readFileSync(join(__dirname, "lua/rate-limit-token-bucket.lua"), "utf-8"),
    });

    client.defineCommand("completeIdempotency", {
      numberOfKeys: 1,
      lua: `
        redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2])
        return "OK"
      `,
    });

    client.defineCommand("releaseIdempotency", {
      numberOfKeys: 1,
      lua: `
        redis.call("DEL", KEYS[1])
        return "OK"
      `,
    });
  }
  return client;
}

declare module "ioredis" {
  interface RedisCommander<Context> {
    checkIdempotency(key: string, ttlSeconds: string): Promise<string | null>;
    completeIdempotency(key: string, responseJson: string, ttlSeconds: string): Promise<string>;
    releaseIdempotency(key: string): Promise<string>;
    checkRateLimit(
      key: string,
      capacity: string,
      refillRate: string,
      now: string,
      requested: string
    ): Promise<number>;
  }
}
