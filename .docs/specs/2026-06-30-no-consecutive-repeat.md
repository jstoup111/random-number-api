---
status: Approved
date: 2026-06-30
---

# No Consecutive Repeat — Design Document

## Problem / Background

`GET /random` generates each number independently via `Math.random()`, with no memory of prior
responses. A caller making back-to-back requests can receive the same number twice in a row. For
use cases where consecutive identical values indicate a bug or degrade user experience, the server
should guarantee that two consecutive responses never return the same number.

## Goals

- Guarantee that no two consecutive calls to `GET /random` return the same integer.
- State is server-global: the constraint applies across all callers, not per-client.

## Non-Goals

- Preventing non-consecutive repeats (e.g., the same number appearing twice in ten calls is fine).
- Per-client deduplication (no session tracking, no caller identity).
- Persistence of last-value state across server restarts.
- Changing the distribution in any other way (uniform random within the range remains the goal).

## Users / Personas

**API consumer** — any HTTP client calling `GET /random` who expects that two back-to-back calls
will always yield different integers.

## Functional Requirements

**FR-1:** The server maintains a single server-global `lastNumber` value, initialized to `null` on
startup.

**FR-2:** On each call to `GET /random`, if the generated candidate equals `lastNumber`, the server
regenerates until the candidate differs.

**FR-3:** After selecting a candidate that differs from `lastNumber`, the server updates
`lastNumber` to the new value before returning.

**FR-4:** `GET /random` called twice in succession always returns two different integers.

**FR-5:** On server startup (or restart), `lastNumber` is `null` — the first call after startup
has no constraint and may return any value in the requested range.

**FR-6:** The constraint applies across all callers. If caller A receives `42`, the next call from
any caller (A or B) will never return `42`.

**FR-7:** If the requested range has only one possible value (i.e., `min === max − 1`... wait,
that's invalid per the range spec), the existing FR-6 from the range spec already rejects
`min >= max`. No additional handling needed.

**FR-8:** If the last returned value falls outside the current request's range (e.g., last was 95,
current range is [1, 10]), the constraint is trivially satisfied — no retry is needed and the
first candidate is returned as-is.

**FR-9:** The response envelope and HTTP status codes are unchanged: `{ "data": { "number": N } }`
with HTTP 200.

## Non-Functional Requirements

- No new production dependencies.
- Expected additional latency per call: negligible (P(one retry) = 1/range ≈ 1% for default [1, 100]).
- All new branches covered by automated tests.

## Acceptance Criteria / Success Metrics

| Scenario | Expected |
|---|---|
| Two consecutive calls with no `min`/`max` | Two different integers in [1, 100] |
| 100 consecutive calls | No two adjacent responses are equal |
| First call after startup | Any integer in range (no constraint) |
| Last value outside current range | First candidate returned, no retry |
| `min`/`max` range with `lastNumber` in range | Candidate retried if equal to `lastNumber` |

## Scope

**In:**
- Module-level `lastNumber` state in `src/routes/random.js`
- Retry loop guarding against consecutive repeat
- Unit tests for the no-repeat invariant

**Out:**
- Per-client or per-session deduplication
- Persisting `lastNumber` across restarts
- Any change to the response envelope or HTTP status codes
- Any change to range validation logic

## Key Decisions & Rationale

**Retry loop over offset arithmetic:** A rejection-sampling loop (regenerate if equal to last) is
the clearest expression of the intent. For the default range [1, 100], P(retry) ≈ 1% per call —
negligible. Offset arithmetic eliminates the loop but introduces non-obvious index math that
requires comments to explain, adding complexity not justified by the risk.

**Server-global state over per-client:** The user confirmed global scope. Per-client tracking
would require session IDs or request fingerprinting — out of scope.

**`null` initial value:** Avoids pre-seeding with an arbitrary number that could silently bias
the first call. The first call after startup is unconstrained by design.

**No special handling for out-of-range `lastNumber`:** If `lastNumber` is outside the current
request's range, the retry condition (`candidate === lastNumber`) can never be true, so the loop
exits on the first attempt. No extra branch needed.

## Dependencies

- `src/routes/random.js` — sole file requiring logic changes
- `test/random.test.js` — extend with consecutive-repeat scenarios

## Open Questions

None.
