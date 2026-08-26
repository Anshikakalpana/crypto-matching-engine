# Crypto Matching Engine

TODO: problem statement, architecture diagram, concurrency/idempotency design
decisions, benchmark numbers.

## Structure
- apps/engine     — in-memory order book + matching logic (core)
- apps/api        — REST API for order placement/cancellation
- apps/worker     — persists trades/state to Postgres
- apps/websocket  — live order book + trade feed
- packages/shared — shared types + event contracts
- packages/database — DB schema

## Running
TODO
# crypto-matching-engine
