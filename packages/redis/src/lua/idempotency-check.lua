-- KEYS[1] = idempotency key (e.g. "idempotency:{clientOrderId}")
-- ARGV[1] = order id to store if this is a new request
-- ARGV[2] = TTL in seconds

local existing = redis.call("GET", KEYS[1])
if existing then
  return existing
end

redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2])
return false
