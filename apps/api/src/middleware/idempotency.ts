import type { Request, Response, NextFunction } from "express";
import { getRedisClient } from "@cme/redis";

const IDEMPOTENCY_TTL_SECONDS = "86400"; // 24 hours
const MAX_POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const clientOrderId = req.body?.clientOrderId;

  if (!clientOrderId || typeof clientOrderId !== "string") {
    res.status(400).json({ error: "clientOrderId is required" });
    return;
  }

  const redis = getRedisClient();
  const key = `idempotency:${clientOrderId}`;

  const existing = await redis.checkIdempotency(key, IDEMPOTENCY_TTL_SECONDS);

    if (existing === null) {
    // We just claimed the key — this is genuinely the first time we've seen this request.
    // Stash the key on the request so the route handler can complete/release it after processing.
    (req as any).idempotencyKey = key;
    next();
    return;
  }

  // The key already existed — someone else claimed it. Figure out what state that's in.
  const state = JSON.parse(existing);

  if (state.status === "completed") {
    // A prior identical request already finished — replay its exact original response.
    res.status(state.httpStatus).json(state.body);
    return;
  }

  if (state.status === "processing") {
    // A prior identical request is still in flight (this is the genuinely tricky race:
    // two near-simultaneous retries). Poll briefly for it to complete rather than
    // immediately erroring or double-processing.
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);
      const latest = await redis.checkIdempotency(key, IDEMPOTENCY_TTL_SECONDS);
      if (latest) {
        const latestState = JSON.parse(latest);
        if (latestState.status === "completed") {
          res.status(latestState.httpStatus).json(latestState.body);
          return;
        }
      }
    }
    // The original request never completed within our poll window — something's wrong
    // (crashed mid-processing, etc). Fail safely rather than double-processing.
    res.status(503).json({
      error: "Original request is still processing; please retry shortly",
      clientOrderId,
    });
    return;
  }

  // Unknown state shape — fail safely.
  res.status(500).json({ error: "Unexpected idempotency state" });
}

