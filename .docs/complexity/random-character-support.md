# Complexity Assessment: Random Character Support

**Date:** 2026-06-30
**Tier:** S

## Signals

| Signal | Value |
|--------|-------|
| Models / tables | 1 (generated_characters) |
| New endpoints | 2 (GET /random/character, GET /random/character/history) |
| Modified endpoints | 0 (new router, existing /random untouched) |
| External integrations | 0 |
| Auth / permissions | No |
| State machines | No |
| Estimated story count | ~6 |

## Rationale

Same shape as the already-built "persist random numbers" feature (one new table, synchronous
SQLite writes via the existing `createDb`/`createRouter(db)` factory pattern, one generation
endpoint, one history endpoint), plus simple `case` query-param validation. No auth, no external
integrations, no state machines, no cross-service calls. Tier S — skip conflict-check,
architecture-diagram, and architecture-review.
