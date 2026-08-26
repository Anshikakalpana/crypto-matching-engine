-- KEYS[1] = bucket key (e.g. "ratelimit:{clientId}")
-- ARGV[1] = max tokens (bucket capacity)
-- ARGV[2] = refill rate (tokens per second)
-- ARGV[3] = current timestamp (ms)
-- ARGV[4] = tokens requested for this call (usually 1)

local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call("HMGET", KEYS[1], "tokens", "lastRefill")
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

local elapsedSeconds = (now - lastRefill) / 1000
local refillAmount = elapsedSeconds * refillRate
tokens = math.min(capacity, tokens + refillAmount)

if tokens >= requested then
  tokens = tokens - requested
  redis.call("HMSET", KEYS[1], "tokens", tokens, "lastRefill", now)
  redis.call("EXPIRE", KEYS[1], 3600)
  return 1
else
  redis.call("HMSET", KEYS[1], "tokens", tokens, "lastRefill", now)
  redis.call("EXPIRE", KEYS[1], 3600)
  return 0
end
