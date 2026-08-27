-- KEYS[1] = idempotency key (e.g. "idempotency:{clientOrderId}")
-- ARGV[1] = TTL in seconds

local existing = redis.call("GET", KEYS[1])
if existing then
  return existing
end

redis.call("SET", KEYS[1], '{"status":"processing"}', "EX", ARGV[1])
return false