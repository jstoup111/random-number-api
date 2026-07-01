# Implementation Plan: Multiple Numbers Per Request

**Date:** 2026-07-01
**Design:** `.docs/specs/2026-07-01-multiple-numbers-per-request.md`
**Stories:** `.docs/stories/multiple-numbers-per-request.md`
**Conflict check:** Skipped (Tier S — see `.docs/complexity/multiple-numbers-per-request.md`)

## Summary

Extends `src/routes/random.js` to accept an optional `count` query parameter on `GET /random`,
returning an array of numbers instead of a single one while preserving the existing
no-consecutive-repeat and persistence guarantees. 13 tasks.

## Technical Approach

The current handler inlines "generate a candidate that differs from `lastNumber`, update
`lastNumber`, persist it" as one sequential block. That block is extracted into a small internal
helper, `generateAndPersistOne(db)`, closed over the existing `lastNumber` variable so both the
scalar path and the batch path call the exact same logic — this is what makes the
no-consecutive-repeat and persistence guarantees automatically hold across a batch and across the
scalar/batch boundary, with no duplicated logic to keep in sync.

`GET /random` then branches on whether `count` was supplied:
- **Absent:** call the helper once, respond with the existing `{ data: { number } }` shape
  (byte-for-byte unchanged — this is the regression-sensitive path).
- **Present:** validate it (integer-parseable, `>= 1`, `<= 100`) before generating anything —
  validation failure returns HTTP 400 and calls the helper zero times, satisfying the
  all-or-nothing requirement (FR-8) for free rather than needing rollback logic. On success, call
  the helper `count` times in a loop, collect the results, respond with
  `{ data: { numbers: [...] } }`.

Validation reuses a strict integer check (reject decimals, non-numeric strings, empty string) plus
two range checks (positive, `<= 100`), mirroring the validation style already used by the range
feature's spec for consistency.

No new files, no schema changes — `generated_numbers` already stores one row per number, so
looping the existing insert satisfies FR-5 without modification.

## Prerequisites

None — builds directly on the current `src/routes/random.js` and `generated_numbers` table.

## Tasks

### Task 1: Extract single-number generation into a reusable helper (refactor)
**Story:** Infrastructure for all stories below
**Type:** infrastructure

**Steps:**
1. Run existing test suite to confirm current green baseline
2. Implement: extract the candidate-generation/persist block inside `GET /random` into a closure
   function `generateAndPersistOne(db)` that reads/updates the shared `lastNumber` variable,
   inserts into `generated_numbers`, and returns the number
3. Update the existing `GET /random` handler to call `generateAndPersistOne(db)` and return
   `{ data: { number } }` with the result
4. Run existing test suite — must remain fully green with no behavior change
5. Commit with message: "Extract single-number generation into reusable helper"

**Files likely touched:**
- `src/routes/random.js` — refactor only, no new behavior

**Dependencies:** none

---

### Task 2: Regression test — no `count` param is unaffected
**Story:** Default single-number request is unaffected by the new parameter (FR-1)
**Type:** happy-path

**Steps:**
1. Write failing test: `GET /random` with an unrelated query param (`?foo=bar`) returns
   `{ data: { number: N } }` (scalar, no `numbers` key) — this will actually pass immediately
   since no `count` handling exists yet, but it locks in the contract before batch logic lands
2. Verify test passes (baseline — this test guards against future regressions, not RED/GREEN)
3. Commit with message: "Add regression test for count-absent scalar response"

**Files likely touched:**
- `test/random.test.js` — new test case

**Dependencies:** Task 1

---

### Task 3: Reject non-integer `count` values
**Story:** Non-integer, zero, or negative count is rejected (FR-6)
**Type:** negative-path

**Steps:**
1. Write failing test: `GET /random?count=abc` and `GET /random?count=2.5` and
   `GET /random?count=` each return HTTP 400 with
   `{ error: { type: "validation", message: "count must be a positive integer" } }`
2. Verify test fails (RED) — no `count` handling exists yet
3. Implement: in `GET /random`, if `req.query.count !== undefined`, parse it with a strict
   integer check (reject decimals/non-numeric/empty); on failure respond 400 with the message
   above and return before generating anything
4. Verify test passes (GREEN)
5. Commit with message: "Reject non-integer count values with 400"

**Files likely touched:**
- `src/routes/random.js` — add count parsing/validation branch
- `test/random.test.js` — new test cases

**Dependencies:** Task 1

---

### Task 4: Reject zero and negative `count` values
**Story:** Non-integer, zero, or negative count is rejected (FR-6)
**Type:** negative-path

**Steps:**
1. Write failing test: `GET /random?count=0` and `GET /random?count=-3` return HTTP 400 with
   `{ error: { type: "validation", message: "count must be a positive integer" } }`
2. Verify test fails (RED)
3. Implement: extend the count validation to require `count >= 1`
4. Verify test passes (GREEN)
5. Commit with message: "Reject zero and negative count values"

**Files likely touched:**
- `src/routes/random.js`
- `test/random.test.js`

**Dependencies:** Task 3

---

### Task 5: Reject `count` above the 100 cap
**Story:** Count exceeding the cap is rejected (FR-7)
**Type:** negative-path

**Steps:**
1. Write failing test: `GET /random?count=101` and `GET /random?count=1000000` return HTTP 400
   with `{ error: { type: "validation", message: "count must not exceed 100" } }`
2. Verify test fails (RED)
3. Implement: add an upper-bound check (`count <= 100`) with the distinct cap error message
4. Verify test passes (GREEN)
5. Commit with message: "Reject count above 100 cap"

**Files likely touched:**
- `src/routes/random.js`
- `test/random.test.js`

**Dependencies:** Task 4

---

### Task 6: Valid `count` returns an array of numbers
**Story:** Requesting a batch of numbers returns an array (FR-2)
**Type:** happy-path

**Steps:**
1. Write failing test: `GET /random?count=5` returns HTTP 200 with
   `{ data: { numbers: [n1..n5] } }`, each an integer in [1, 100]
2. Verify test fails (RED) — validation exists but no batch generation path yet
3. Implement: on valid `count`, loop `generateAndPersistOne(db)` `count` times, collect results
   into an array, respond `{ data: { numbers } }`
4. Verify test passes (GREEN)
5. Commit with message: "Implement batch generation for valid count"

**Files likely touched:**
- `src/routes/random.js`
- `test/random.test.js`

**Dependencies:** Task 5

---

### Task 7: `count=1` returns array shape, not scalar
**Story:** Requesting a batch of numbers returns an array (FR-2)
**Type:** happy-path

**Steps:**
1. Write failing test: `GET /random?count=1` returns `{ data: { numbers: [n1] } }`, not
   `{ data: { number: n1 } }`
2. Verify test passes immediately given Task 6's implementation (confirms branch is keyed on
   parameter presence, not value) — if it fails, fix the branch condition
3. Commit with message: "Assert count=1 uses array response shape"

**Files likely touched:**
- `test/random.test.js`

**Dependencies:** Task 6

---

### Task 8: `count=100` boundary returns exactly 100 numbers
**Story:** Requesting a batch of numbers returns an array (FR-2)
**Type:** happy-path

**Steps:**
1. Write failing test: `GET /random?count=100` returns exactly 100 integers in [1, 100], HTTP 200
2. Verify test passes given Task 6/5's implementation; if it fails, fix off-by-one in the cap
   check
3. Commit with message: "Assert count=100 boundary returns full batch"

**Files likely touched:**
- `test/random.test.js`

**Dependencies:** Task 6

---

### Task 9: No-consecutive-repeat holds within a batch
**Story:** No-consecutive-repeat holds within a batch and across requests (FR-3)
**Type:** happy-path

**Steps:**
1. Write failing test: `GET /random?count=50` on a fresh server has zero adjacent duplicate
   pairs in the returned array
2. Verify test passes given `generateAndPersistOne` is reused per iteration (Task 1); if it
   fails, check the loop calls the helper instead of `Math.random()` directly
3. Commit with message: "Assert no-consecutive-repeat holds within a batch"

**Files likely touched:**
- `test/random.test.js`

**Dependencies:** Task 6

---

### Task 10: No-consecutive-repeat carries across the scalar/batch boundary
**Story:** No-consecutive-repeat holds within a batch and across requests (FR-3, FR-4)
**Type:** happy-path

**Steps:**
1. Write failing test: a single `GET /random` call's returned number never appears as the first
   element of an immediately following `GET /random?count=10` call; and a batch's last element
   never matches an immediately following single `GET /random` call's number
2. Verify test passes given the shared `lastNumber` closure (Task 1); if it fails, check the
   batch loop updates the same `lastNumber` variable the scalar path reads
3. Commit with message: "Assert no-consecutive-repeat carries across scalar/batch boundary"

**Files likely touched:**
- `test/random.test.js`

**Dependencies:** Task 6

---

### Task 11: Batch of 100 terminates without excessive retries
**Story:** No-consecutive-repeat holds within a batch and across requests (FR-3)
**Type:** negative-path

**Steps:**
1. Write failing test: `GET /random?count=100` completes within the test framework's default
   timeout and returns exactly 100 numbers with no adjacent duplicates
2. Verify test passes given the regenerate-until-different loop has a 1-in-100 collision chance
   per iteration (bounded expected retries); if flaky/slow, this surfaces a design issue to
   revisit, not a test bug
3. Commit with message: "Assert max-size batch terminates promptly"

**Files likely touched:**
- `test/random.test.js`

**Dependencies:** Task 8

---

### Task 12: Every batch number is persisted individually in order
**Story:** Every number in a batch is persisted individually (FR-5)
**Type:** happy-path

**Steps:**
1. Write failing test: starting from empty history, `GET /random?count=5` followed by
   `GET /random/history` returns 5 entries whose `number` values match the batch response, most
   recent first
2. Verify test passes given Task 1's helper already persists per call; if it fails, check the
   loop isn't batching inserts or losing order
3. Commit with message: "Assert batch numbers persist individually and in order"

**Files likely touched:**
- `test/random.test.js`

**Dependencies:** Task 6

---

### Task 13: Rejected batch requests persist nothing
**Story:** Every number in a batch is persisted individually (FR-8); Count exceeding the cap is
rejected (FR-8)
**Type:** negative-path

**Steps:**
1. Write failing test: `GET /random/history` row count is unchanged after `GET /random?count=0`
   and after `GET /random?count=101`
2. Verify test passes given validation runs and returns before any call to
   `generateAndPersistOne` (Tasks 3-5); if it fails, check the validation branch returns early
3. Commit with message: "Assert rejected batch requests persist nothing"

**Files likely touched:**
- `test/random.test.js`

**Dependencies:** Task 5

## Task Dependency Graph

```
Task 1 (extract helper)
  ├─▶ Task 2 (regression: count absent)
  ├─▶ Task 3 (reject non-integer)
  │     └─▶ Task 4 (reject zero/negative)
  │           └─▶ Task 5 (reject over-cap)
  │                 ├─▶ Task 6 (batch happy path)
  │                 │     ├─▶ Task 7 (count=1 array shape)
  │                 │     ├─▶ Task 8 (count=100 boundary)
  │                 │     │     └─▶ Task 11 (max-size termination)
  │                 │     ├─▶ Task 9 (no-repeat within batch)
  │                 │     ├─▶ Task 10 (no-repeat across boundary)
  │                 │     └─▶ Task 12 (persist per number)
  │                 └─▶ Task 13 (rejected batch persists nothing)
```

## Integration Points

- After Task 1: existing single-number flow is refactored but behaviorally identical — full
  regression suite must stay green
- After Task 5: all validation branches complete — invalid `count` requests fully handled
- After Task 6: batch generation is end-to-end functional — can manually verify with curl
- After Task 13: feature is fully covered per the plan; ready for `/writing-system-tests` and
  TDD execution

## Verification

- [x] All happy path criteria covered by at least one task
- [x] All negative path criteria covered by at least one task
- [x] No task exceeds 5 minutes of work
- [x] Dependencies are explicit and acyclic

## Coverage Mapping

| Story / Criterion | Task(s) |
|---|---|
| FR-1: count absent unaffected | Task 2 |
| FR-2: valid count returns array | Task 6, 7, 8 |
| FR-3: no-repeat within batch | Task 9, 11 |
| FR-3/FR-4: no-repeat across boundary | Task 10 |
| FR-5: per-number persistence, order | Task 12 |
| FR-6: non-integer/zero/negative rejected | Task 3, 4 |
| FR-7: over-cap rejected | Task 5 |
| FR-8: all-or-nothing (no partial persistence) | Task 13 |
