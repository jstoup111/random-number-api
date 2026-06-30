---
status: Approved
date: 2026-06-30
---

# Random Number Range Support — Design Document

## Problem / Background

The current `GET /random` endpoint returns a random integer between 1 and 100 (inclusive) with no
caller control over the range. Callers who need numbers in a different range must apply client-side
transformations, which is error-prone and defeats the purpose of a general-purpose random number
service.

## Goals

- Allow callers to optionally specify `min` and `max` query parameters to control the output range.
- Maintain full backward compatibility — callers without `min`/`max` get the existing [1, 100]
  behavior unchanged.

## Non-Goals

- Floating-point (non-integer) output
- Multiple numbers per request
- Seeding or reproducibility
- Authentication or rate limiting

## Users / Personas

**API consumer** — any HTTP client calling `GET /random` who wants a number within a specific range
(e.g., a game needing dice rolls, a test harness needing bounded values, a simulation tool).

## Functional Requirements

**FR-1:** `GET /random` with no query parameters returns a random integer in [1, 100] inclusive —
backward-compatible behavior unchanged.

**FR-2:** `GET /random?min=N&max=M` returns a random integer in [N, M] inclusive, where N and M
are valid integers and N < M.

**FR-3:** `GET /random?min=N` (no `max`) returns a random integer in [N, 100] inclusive, applying
the default max of 100.

**FR-4:** `GET /random?max=M` (no `min`) returns a random integer in [1, M] inclusive, applying
the default min of 1.

**FR-5:** If `min` or `max` is provided but is not a valid integer (e.g., a decimal, a string,
empty string), the endpoint returns HTTP 400 with:
`{ "error": { "type": "validation", "message": "min and max must be integers" } }`

**FR-6:** If the resolved `min` is greater than or equal to the resolved `max`, the endpoint
returns HTTP 400 with:
`{ "error": { "type": "validation", "message": "min must be less than max" } }`

**FR-7:** A valid range request returns the same response envelope as the existing contract:
`{ "data": { "number": N } }` with HTTP 200.

## Non-Functional Requirements

- No new production dependencies; range arithmetic uses only existing JS primitives.
- All new query-parameter branches covered by automated tests.
- Response time unchanged (sub-millisecond arithmetic).

## Acceptance Criteria / Success Metrics

| Request | Expected |
|---|---|
| `GET /random` | Integer in [1, 100], HTTP 200 |
| `GET /random?min=5&max=10` | Integer in [5, 10] across 20 calls, HTTP 200 |
| `GET /random?min=5` | Integer in [5, 100], HTTP 200 |
| `GET /random?max=50` | Integer in [1, 50], HTTP 200 |
| `GET /random?min=abc` | HTTP 400, `validation` error type |
| `GET /random?min=1.5&max=10` | HTTP 400, `validation` error type |
| `GET /random?min=10&max=5` | HTTP 400, `validation` error type |
| `GET /random?min=5&max=5` | HTTP 400, `validation` error type |

## Scope

**In:**
- Query parameter parsing (`min`, `max`) on `GET /random`
- Input validation with HTTP 400 error responses
- Independent defaults: min defaults to 1, max defaults to 100

**Out:**
- Floating-point range support
- Multiple numbers per request
- New endpoints or HTTP methods
- Changes to the API response envelope structure

## Key Decisions & Rationale

**Query parameters over path segments:** Keeps the endpoint URL stable (`/random`) and makes
parameters genuinely optional without path combinatorics. Consistent with REST conventions for
optional filtering behavior.

**Independent defaults (FR-3, FR-4):** Allowing one-sided ranges is more ergonomic than requiring
both or neither. Defaults mirror the current behavior so one-sided calls expand from the familiar
baseline without surprises.

**`validation` error type:** The existing contract defines `not_found` and `internal`. Adding
`validation` is additive and non-breaking. HTTP 400 is the correct status for caller-supplied bad
input.

**min strictly less than max:** A range of [N, N] is degenerate (always returns N) and likely a
caller bug. Returning an error surfaces the mistake; silently returning a constant would hide it.

## Dependencies

- `src/routes/random.js` — sole file requiring logic changes
- `test/random.test.js` — extend with range and validation scenarios
- `.docs/decisions/api-response-contract.md` — addendum to document the new `validation` error type

## Open Questions

None — scope is narrow and all edge cases are resolved by FR-5 and FR-6.
