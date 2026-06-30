# Implementation Plan: No Consecutive Repeat

**Date:** 2026-06-30
**Design:** `.docs/specs/2026-06-30-no-consecutive-repeat.md`
**Stories:** `.docs/stories/no-consecutive-repeat.md`
**Conflict check:** Skipped (Tier S)

## Summary

Adds a module-level `lastNumber` guard to `src/routes/random.js` so that no two consecutive
`GET /random` responses return the same integer. 7 tasks covering infrastructure, happy paths,
and negative paths.

## Technical Approach

`src/routes/random.js` gains a module-scoped `let lastNumber = null`. The route handler wraps
candidate generation in a `do…while (candidate === lastNumber)` loop, then writes the chosen
value back to `lastNumber` before responding.

The `null` initial value means the first call never triggers a retry (any integer ≠ null). The
out-of-range case (FR-8) is automatically correct: if `lastNumber` is outside `[min, max]`, the
loop condition is never true on any candidate, so the first candidate is always accepted — no
extra branch.

For test isolation, the module exports two test-only helpers (`_reset`, `_getLastNumber`) so
Jest tests can control and observe module state without reloading the module between every case.
All test helpers are underscore-prefixed to signal they are not production surface.

**Dependency note — Story 3 (out-of-range):** The `?min` / `?max` query parameters are defined
in the approved range-support spec but are not yet implemented in `src/routes/random.js`. Tasks
6–7 cover the out-of-range logic and can be implemented regardless; end-to-end HTTP tests for
those tasks require range support to be shipped first. Tasks 6–7 are therefore marked as
partially dependent on the range-support plan.

## Prerequisites

- None. No migrations, no new packages, no new routes.

## Tasks

### Task 1: Add module-level state and test-only reset helpers
**Story:** Story 2 (first call after startup — FR-5) / infrastructure
**Type:** infrastructure

**Steps:**
1. Write failing test: `const route = require('../src/routes/random'); expect(route._getLastNumber()).toBeNull();`
2. Verify test fails (RED) — `_getLastNumber` is undefined
3. Implement: add `let lastNumber = null` at top of `src/routes/random.js`; export `_reset = () => { lastNumber = null }` and `_getLastNumber = () => lastNumber` on the router object
4. Verify test passes (GREEN)
5. Commit: `test: export _reset/_getLastNumber state helpers for test isolation`

**Files likely touched:**
- `src/routes/random.js` — add `lastNumber`, `router._reset`, `router._getLastNumber`
- `test/random.test.js` — add `require`-level import and the initial-null assertion

**Dependencies:** none

---

### Task 2: Retry loop — consecutive calls always differ (happy path)
**Story:** Story 1 — "Two consecutive GET /random calls return different integers"
**Type:** happy-path

**Steps:**
1. Write failing test: call `GET /random` twice; assert `res1.body.data.number !== res2.body.data.number`. Run 10 pairs for statistical confidence.
2. Verify test fails (RED) — current implementation has no guard
3. Implement: replace `const number = Math.floor(...) + 1` with a `do { candidate = ... } while (candidate === lastNumber)` loop; assign `lastNumber = candidate` before `res.json`
4. Verify test passes (GREEN)
5. Commit: `feat: retry loop prevents consecutive duplicate responses`

**Files likely touched:**
- `src/routes/random.js` — core loop change
- `test/random.test.js` — new consecutive-pair test

**Dependencies:** Task 1 (lastNumber variable must exist)

---

### Task 3: 100 sequential calls — no adjacent duplicates (happy path)
**Story:** Story 1 — "100 consecutive calls produce no adjacent duplicates"
**Type:** happy-path

**Steps:**
1. Write failing test: fire 100 sequential `GET /random` requests; collect numbers; assert every pair `[i], [i+1]` differs. (Task 2's loop already makes this pass — run RED first to confirm the test is new and meaningful before Task 2 is committed; if running after Task 2, verify it is GREEN.)
2. Verify test is meaningful (fails against the unguarded implementation)
3. No new implementation needed — covered by Task 2's loop
4. Verify test passes (GREEN) with Task 2's implementation
5. Commit: `test: 100-call sequential no-adjacent-duplicate coverage`

**Files likely touched:**
- `test/random.test.js` — 100-call loop test

**Dependencies:** Task 2

---

### Task 4: lastNumber updated to returned value after each call (happy path)
**Story:** Story 2 — "After the first request, lastNumber equals the value that was returned"
**Type:** happy-path

**Steps:**
1. Write failing test: `_reset()`; call `GET /random`; assert `_getLastNumber() === res.body.data.number`
2. Verify test fails (RED) — `_getLastNumber` not yet implemented (pre-Task 1) or `lastNumber` not updated (pre-Task 2)
3. No new implementation — covered by Tasks 1 + 2
4. Verify GREEN after Tasks 1–2
5. Commit: `test: verify lastNumber equals last returned value`

**Files likely touched:**
- `test/random.test.js` — state-inspection assertion

**Dependencies:** Tasks 1, 2

---

### Task 5: null initial state — retry loop skipped on first call (negative path)
**Story:** Story 2 — "Given lastNumber is null, the first candidate is always accepted"
**Type:** negative-path

**Steps:**
1. Write failing test: mock `Math.random` to return a fixed value (e.g., `0.41` → number `42`); `_reset()`; call `GET /random` once; assert response is `42` and `Math.random` was called exactly once (no retry)
2. Verify test fails (RED) — spy not yet wired
3. Implementation: confirm the loop condition `candidate === lastNumber` is falsy when `lastNumber` is `null` (no code change needed if `!== null` comparison is used; adjust if needed)
4. Verify GREEN
5. Commit: `test: first call after reset skips retry loop`

**Files likely touched:**
- `test/random.test.js` — `jest.spyOn(Math, 'random')` + call-count assertion

**Dependencies:** Tasks 1, 2

---

### Task 6: Retry fires when candidate equals lastNumber (negative path)
**Story:** Story 1 — "Retry loop keeps generating until value ≠ lastNumber"
**Type:** negative-path

**Steps:**
1. Write failing test: mock `Math.random` to return sequence `[0.41, 0.41, 0.42]` (→ 42, 42, 43); set `lastNumber = 42` via `_reset()` + prime call; call `GET /random`; assert returned number is `43` and `Math.random` was called at least twice
2. Verify test fails (RED) without the loop
3. No new implementation — loop in Task 2 handles this
4. Verify GREEN
5. Commit: `test: retry loop fires on candidate === lastNumber`

**Files likely touched:**
- `test/random.test.js` — `jest.spyOn` sequence mock + call-count assertion

**Dependencies:** Tasks 1, 2

---

### Task 7: Out-of-range lastNumber causes no retry (negative path / FR-8)
**Story:** Story 3 — "When lastNumber is outside [min, max], first candidate returned immediately"
**Type:** negative-path

**Steps:**
1. Write failing test: mock `Math.random` to return `0.05` (→ number 6 in [1,100]); `_reset()`; prime `lastNumber` to `95` by making one call that returns 95 (or set via a direct route-state helper if available); call `GET /random?min=1&max=10`; assert number is `6` and `Math.random` called exactly once
2. Verify RED (requires range support to be shipped for full HTTP test; if not yet available, test the loop condition in isolation via unit test on the route handler function)
3. No new implementation — `candidate === lastNumber` is never true when `lastNumber` is out of range
4. Verify GREEN
5. Commit: `test: out-of-range lastNumber skips retry`

**Files likely touched:**
- `test/random.test.js` — out-of-range scenario

**Dependencies:** Tasks 1, 2; range-support plan (for HTTP-level test)

---

## Task Dependency Graph

```
Task 1 (state + helpers)
  └─▶ Task 2 (retry loop implementation)
        ├─▶ Task 3 (100-call test)
        ├─▶ Task 4 (lastNumber update test)
        ├─▶ Task 5 (null initial state test)
        ├─▶ Task 6 (retry-fires negative path)
        └─▶ Task 7 (out-of-range, partial dep on range-support plan)
```

## Integration Points

- After Task 2: full end-to-end consecutive-repeat invariant is live and testable via `curl`
- After Task 6: full negative-path suite for the retry loop is green
- After Task 7 + range-support plan: FR-8 fully verified end-to-end

## Coverage Mapping

| Acceptance Criterion | Task(s) |
|---|---|
| Two consecutive calls differ | Task 2, 3 |
| 100 sequential calls — no adjacent duplicates | Task 3 |
| Global state: caller A's last blocks caller B | Task 3 (sequential calls from same process) |
| Retry loop keeps generating on match | Task 6 |
| `lastNumber` is `null` on init | Task 1 |
| First call after startup unconstrained | Task 5 |
| `lastNumber` updated to returned value | Task 4 |
| `null` treated as "no constraint" | Task 5 |
| Out-of-range `lastNumber` → no retry | Task 7 |
| In-range `lastNumber` matching candidate → retry fires | Task 6 |

## Verification

- [x] All happy path criteria covered by at least one task
- [x] All negative path criteria covered by at least one task
- [x] No task exceeds 5 minutes of work
- [x] Dependencies are explicit and acyclic
