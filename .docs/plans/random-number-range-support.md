# Implementation Plan: Random Number Range Support

**Date:** 2026-06-30
**Design:** `.docs/specs/2026-06-30-random-number-range-support.md`
**Stories:** `.docs/stories/random-number-range-support.md`
**Conflict check:** Skipped (Tier S)

## Summary

Extends `src/routes/random.js` to accept optional `min` and `max` query parameters with
defaults of 1 and 100. 8 tasks covering infrastructure, 4 happy paths, and 5 negative-path
validations.

## Technical Approach

All changes are isolated to a single file: `src/routes/random.js`. The approach:

1. **Parse** `req.query.min` and `req.query.max` — both optional.
2. **Validate type** — if a param is provided, it must be a whole integer string (no decimals,
   no non-numeric characters, no empty string). A small helper `parseQueryInt(val)` returns the
   integer or `null` on failure.
3. **Apply defaults** — `min` defaults to `1`, `max` defaults to `100` if not provided.
4. **Validate range** — resolved `min` must be strictly less than resolved `max`. Return 400
   otherwise.
5. **Generate** — `Math.floor(Math.random() * (max - min + 1)) + min`.

Tests go in `test/random.test.js`, appended to the existing suite. No new files; no dependency
changes.

## Prerequisites

None — `src/routes/random.js` and `test/random.test.js` already exist.

## Tasks

### Task 1: Route infrastructure — parse params and preserve default behavior
**Story:** Default Range Preserved (FR-1, happy path)
**Type:** infrastructure

**Steps:**
1. Write failing test: `GET /random` with no params still returns HTTP 200 with `data.number` ∈ [1, 100] (regression guard — should already pass, but pin it before touching the file)
2. Verify test passes in current state (GREEN baseline)
3. Refactor `src/routes/random.js` to extract `min`/`max` from `req.query` with defaults `1`/`100`, then generate `Math.floor(Math.random() * (max - min + 1)) + min`
4. Verify the pinned test still passes (GREEN)
5. Commit: `refactor: extract min/max with defaults in /random handler`

**Files likely touched:**
- `src/routes/random.js` — restructure generation to use resolved min/max
- `test/random.test.js` — add regression-guard test

**Dependencies:** none

---

### Task 2: Happy path — full range with both params
**Story:** Custom Full Range (FR-2, FR-7, happy path)
**Type:** happy-path

**Steps:**
1. Write failing test: `GET /random?min=5&max=10` returns HTTP 200 with `data.number` in [5, 10] across 20 calls; response envelope is `{ "data": { "number": N } }`
2. Verify test fails (RED) — current implementation ignores query params
3. No implementation change needed if Task 1 is done correctly — the general formula already handles arbitrary min/max; verify by running the test
4. Verify test passes (GREEN)
5. Commit: `feat: support min/max query params for bounded random number`

**Files likely touched:**
- `test/random.test.js` — add range test

**Dependencies:** Task 1

---

### Task 3: Happy path — min-only parameter
**Story:** Min-Only Parameter (FR-3, happy path)
**Type:** happy-path

**Steps:**
1. Write failing test: `GET /random?min=5` (no `max`) returns HTTP 200 with `data.number` in [5, 100] across 20 calls
2. Verify test fails (RED)
3. Confirm default-max logic in handler correctly resolves to 100 when `max` is absent
4. Verify test passes (GREEN)
5. Commit: `test: min-only parameter uses default max of 100`

**Files likely touched:**
- `test/random.test.js` — add min-only test

**Dependencies:** Task 1

---

### Task 4: Happy path — max-only parameter
**Story:** Max-Only Parameter (FR-4, happy path)
**Type:** happy-path

**Steps:**
1. Write failing test: `GET /random?max=50` (no `min`) returns HTTP 200 with `data.number` in [1, 50] across 20 calls
2. Verify test fails (RED)
3. Confirm default-min logic in handler correctly resolves to 1 when `min` is absent
4. Verify test passes (GREEN)
5. Commit: `test: max-only parameter uses default min of 1`

**Files likely touched:**
- `test/random.test.js` — add max-only test

**Dependencies:** Task 1

---

### Task 5: Negative path — type validation (non-integer params)
**Story:** Parameter Type Validation (FR-5, negative paths)
**Type:** negative-path

**Steps:**
1. Write failing tests:
   - `GET /random?min=abc` → HTTP 400, body `{ "error": { "type": "validation", "message": "min and max must be integers" } }`
   - `GET /random?min=1.5&max=10` → HTTP 400 (decimal rejected)
   - `GET /random?max=` → HTTP 400 (empty string rejected)
2. Verify tests fail (RED) — handler currently ignores query params
3. Implement `parseQueryInt(val)` helper in `src/routes/random.js`: returns integer if `val` matches `/^-?\d+$/`, else `null`. Apply to both params; return 400 with validation envelope if either returns `null`.
4. Verify all three tests pass (GREEN)
5. Commit: `feat: validate min/max must be integers, return 400 on invalid input`

**Files likely touched:**
- `src/routes/random.js` — add `parseQueryInt` helper and validation check
- `test/random.test.js` — add three negative-path tests

**Dependencies:** Task 1

---

### Task 6: Negative path — range ordering validation
**Story:** Range Ordering Validation (FR-6, negative paths)
**Type:** negative-path

**Steps:**
1. Write failing tests:
   - `GET /random?min=5&max=5` → HTTP 400, body `{ "error": { "type": "validation", "message": "min must be less than max" } }`
   - `GET /random?min=10&max=3` → HTTP 400
   - `GET /random?min=1&max=2` → HTTP 200 (boundary: minimum valid gap)
2. Verify first two fail (RED), third passes
3. Add `if (min >= max)` check in handler after defaults are applied, returning 400 with range error envelope
4. Verify all three tests pass (GREEN)
5. Commit: `feat: validate min must be strictly less than max`

**Files likely touched:**
- `src/routes/random.js` — add `min >= max` guard
- `test/random.test.js` — add ordering tests

**Dependencies:** Task 5 (type validation must run first so range check only sees valid integers)

---

### Task 7: Negative path — one-sided range edge cases
**Story:** Min-Only Parameter (FR-3, negative path); Max-Only Parameter (FR-4, negative path)
**Type:** negative-path

**Steps:**
1. Write failing tests:
   - `GET /random?min=101` → HTTP 400 (resolved: min=101, max=100 → invalid range)
   - `GET /random?max=0` → HTTP 400 (resolved: min=1, max=0 → invalid range)
2. Verify tests fail (RED) — ordering guard not yet in place if Tasks 5–6 not done
3. No new implementation: Tasks 5 and 6 already cover the validation logic; confirm tests pass
4. Verify both tests pass (GREEN)
5. Commit: `test: one-sided params that produce invalid ranges return 400`

**Files likely touched:**
- `test/random.test.js` — add two edge-case tests

**Dependencies:** Task 6

---

### Task 8: Negative path — unknown query params ignored
**Story:** Default Range Preserved (FR-1, negative path)
**Type:** negative-path

**Steps:**
1. Write failing test: `GET /random?foo=bar` returns HTTP 200 with `data.number` ∈ [1, 100] — unrecognised params don't trigger validation or alter results
2. Verify test passes immediately (GREEN) — Express ignores unknown query params; `parseQueryInt` is only called on `min`/`max`
3. No implementation change needed — confirm test is stable across 5 runs
4. Commit: `test: unknown query params are silently ignored`

**Files likely touched:**
- `test/random.test.js` — add unknown-param test

**Dependencies:** Task 5

---

## Task Dependency Graph

```
Task 1 (infrastructure)
  └─▶ Task 2 (full range happy)
  └─▶ Task 3 (min-only happy)
  └─▶ Task 4 (max-only happy)
  └─▶ Task 5 (type validation)
        └─▶ Task 6 (range ordering)
              └─▶ Task 7 (one-sided edge cases)
        └─▶ Task 8 (unknown params ignored)
```

Tasks 2, 3, 4, 5 can run in parallel after Task 1. Tasks 6–8 require Task 5.

## Integration Points

- After Task 1: `GET /random` (no params) still works end-to-end
- After Task 2: Full range `?min=5&max=10` testable via curl
- After Task 6: All validation paths exercisable end-to-end

## Coverage Mapping

| Acceptance Criterion | Task |
|---|---|
| FR-1: no params → [1, 100] | Task 1 |
| FR-1 neg: unknown params ignored | Task 8 |
| FR-2: ?min=5&max=10 → [5, 10] | Task 2 |
| FR-2 neg: inverted range → 400 | Task 6 |
| FR-3: ?min=5 → [5, 100] | Task 3 |
| FR-3 neg: ?min=101 → 400 | Task 7 |
| FR-4: ?max=50 → [1, 50] | Task 4 |
| FR-4 neg: ?max=0 → 400 | Task 7 |
| FR-5: ?min=abc → 400 | Task 5 |
| FR-5: ?min=1.5 → 400 | Task 5 |
| FR-5: ?max= → 400 | Task 5 |
| FR-6: ?min=5&max=5 → 400 | Task 6 |
| FR-6: ?min=10&max=3 → 400 | Task 6 |
| FR-6: ?min=1&max=2 → 200 | Task 6 |
| FR-7: valid range returns same envelope | Task 2 |

## Verification

- [x] All happy path criteria covered by at least one task
- [x] All negative path criteria covered by at least one task
- [x] No task exceeds 5 minutes of work
- [x] Dependencies are explicit and acyclic
