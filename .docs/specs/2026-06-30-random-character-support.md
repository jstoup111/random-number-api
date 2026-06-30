---
status: Approved
date: 2026-06-30
---

# Random Character Support — Design Document

## Problem / Background

The API currently only generates random numbers (`GET /random`). Callers who need a random
letter (e.g., for simple games, CAPTCHA-style helpers, or test data generation) have no endpoint
to call and must implement character generation client-side.

## Goals

- Add a new endpoint that returns a single random character.
- Allow callers to optionally constrain the result to uppercase or lowercase letters.
- Persist generated characters and expose their history, consistent with how `GET /random`
  persists generated numbers.

## Non-Goals

- Multi-character strings or a `length` parameter
- Digits, symbols, or any non-letter character classes
- Consecutive-repeat avoidance (the `lastNumber` no-repeat rule on `GET /random` does not extend
  to characters — they are an independent value space with independent state)
- Authentication or rate limiting

## Users / Personas

**API consumer** — any HTTP client calling `GET /random/character` who wants a single random
letter, optionally constrained to a specific case (e.g., a game needing a random letter, a test
harness needing bounded character values).

## Functional Requirements

**FR-1:** `GET /random/character` with no query parameters returns a single random letter drawn
from mixed-case `a-zA-Z` (52 possible characters).

**FR-2:** `GET /random/character?case=upper` returns a single random letter drawn from `A-Z` only.

**FR-3:** `GET /random/character?case=lower` returns a single random letter drawn from `a-z` only.

**FR-4:** `GET /random/character?case=mixed` is equivalent to FR-1 (explicit form of the default).

**FR-5:** If `case` is provided with any value other than `upper`, `lower`, or `mixed`, the
endpoint returns HTTP 400 with:
`{ "error": { "type": "validation", "message": "case must be one of: upper, lower, mixed" } }`

**FR-6:** A valid request returns HTTP 200 with the response envelope:
`{ "data": { "character": "X" } }`

**FR-7:** Every successfully generated character is persisted (character, case used, generation
timestamp) before the response is returned, mirroring how `GET /random` persists numbers.

**FR-8:** `GET /random/character/history` returns HTTP 200 with all persisted characters, most
recent first: `{ "data": { "characters": [{ "character": "X", "generatedAt": "..." }, ...] } }`.
An empty history returns `{ "data": { "characters": [] } }`.

**FR-9:** If the database is unavailable, `GET /random/character` and
`GET /random/character/history` return HTTP 500 with
`{ "error": { "type": "internal", "message": "Internal server error" } }`, matching the existing
error-handling pattern for `GET /random` and `GET /random/history`.

## Non-Functional Requirements

- No new production dependencies; reuses the existing `better-sqlite3` connection and
  `createDb`/`createFallbackDb` factory pattern.
- All new query-parameter and persistence branches covered by automated tests.
- Response time unchanged (sub-millisecond character selection and a single synchronous insert).

## Acceptance Criteria / Success Metrics

| Request | Expected |
|---|---|
| `GET /random/character` | Single character in `[a-zA-Z]`, HTTP 200 |
| `GET /random/character?case=upper` | Single character in `[A-Z]`, HTTP 200 |
| `GET /random/character?case=lower` | Single character in `[a-z]`, HTTP 200 |
| `GET /random/character?case=mixed` | Single character in `[a-zA-Z]`, HTTP 200 |
| `GET /random/character?case=digits` | HTTP 400, `validation` error type |
| `GET /random/character/history` (empty) | HTTP 200, `{ "data": { "characters": [] } }` |
| `GET /random/character/history` (after generating) | HTTP 200, most-recent-first list |
| `GET /random/character` with unreachable DB | HTTP 500, `internal` error type |

## Scope

**In:**
- New route file for character generation, following the `createRouter(db)` factory pattern
- `GET /random/character` with optional `case` query parameter
- `GET /random/character/history`
- New `generated_characters` table, created alongside `generated_numbers` in `createDb`
- Input validation with HTTP 400 error responses for invalid `case` values

**Out:**
- Multi-character strings / `length` parameter
- Non-letter character classes (digits, symbols)
- Shared or cross-endpoint no-repeat state
- Changes to the existing `/random` number endpoints or their table

## Key Decisions & Rationale

**New endpoint over extending `/random`:** `/random`'s contract is number-only and already has
in-flight range-support work (`min`/`max`). A new `GET /random/character` route keeps each
value-type's contract independent, consistent with this API's one-endpoint-per-value-type
pattern (numbers vs. characters), rather than overloading one endpoint with a `type` discriminator.

**Letters-only default, `case` override:** Mirrors the existing override pattern used by
`min`/`max` on `/random` — sensible default behavior with an optional, explicit override.
Restricting to letters (no digits/symbols) keeps the initial scope narrow and matches the literal
ask ("random character support").

**No shared no-repeat state:** Numbers and characters are different value spaces; tracking a
separate "last character" purely for consistency was explicitly descoped — it adds state not
implied by the original request and isn't needed for any stated use case.

**Persist + history, mirroring numbers:** The number endpoint already persists every generation
and exposes history. Treating characters identically keeps the API self-consistent and avoids a
asymmetry where only one value type is queryable historically.

**`validation` error type:** The current ADR (`api-response-contract.md`) only documents
`not_found` and `internal`. Adding `validation` for bad `case` values is additive and
non-breaking, matching the same gap already identified by the (not-yet-built) range-support spec.

## Dependencies

- `src/db.js` — add `generated_characters` table creation alongside `generated_numbers`
- `src/routes/character.js` (new) — `createRouter(db)` for `GET /random/character` and
  `GET /random/character/history`
- `src/app.js` — mount the new character router alongside the existing random router
- `test/character.test.js` (new) — unit/integration tests for the new endpoints
- `.docs/decisions/api-response-contract.md` — amendment to document the `validation` error type
  (first introduced here; also referenced by the pending range-support spec)

## Open Questions

None — scope is narrow (single letter, two endpoints, three case modes) and all edge cases are
resolved by FR-5 and FR-9.
