# Implementation Plan: Random Character Support

**Date:** 2026-06-30
**Design:** .docs/specs/2026-06-30-random-character-support.md
**Stories:** .docs/stories/random-character-support.md
**Conflict check:** Skipped — Tier S (.docs/complexity/random-character-support.md)

## Summary

Adds `GET /random/character` (optionally constrained by `?case=upper|lower|mixed`) and
`GET /random/character/history`, persisted to a new `generated_characters` table, following the
exact same `createDb`/`createRouter(db)` factory pattern already used for numbers. 17 tasks.

## Technical Approach

- **Schema:** extend `createDb()` in `src/db.js` to also create `generated_characters(id, character
  TEXT NOT NULL, case_used TEXT NOT NULL, generated_at TEXT NOT NULL)` — additive, no change to
  `generated_numbers`.
- **Router:** new `src/routes/character.js` exporting `createRouter(db)`, mirroring
  `src/routes/random.js`'s shape: a `CASE_SETS` map (`mixed: 'a-zA-Z'`, `upper: 'A-Z'`,
  `lower: 'a-z'`), a `parseCase(req)` helper returning either a resolved charset or a validation
  error, and two routes wrapped in try/catch returning the existing `internal`/`validation`
  error envelopes.
- **Wiring:** mount the new router in `src/app.js` alongside the existing random router — both
  use the same `db` instance passed into `createApp(db)`.
- **Persistence:** insert `(character, case_used, generated_at)` synchronously before responding,
  matching the number endpoint's insert-then-respond ordering.
- **Sequencing:** schema → router skeleton + app wiring → happy paths (default/mixed, upper,
  lower) → negative paths (invalid case values, wrong method) → persistence assertion → history
  endpoint (empty, ordered, wrong method) → DB-unavailable error handling for both routes.

## Prerequisites

- None beyond what's already in the repo (`better-sqlite3`, `createDb`/`createFallbackDb`,
  `createApp(db)` factory pattern all exist).

## Tasks

### Task 1: Add `generated_characters` table to schema
**Story:** Persist every generated character (FR-7) — schema prerequisite
**Type:** infrastructure

**Steps:**
1. Write failing test in `test/db.test.js`: `createDb(':memory:')` then query
   `sqlite_master` for a table named `generated_characters`; assert it exists with columns
   `character`, `case_used`, `generated_at`.
2. Verify test fails (RED).
3. Implement: add `CREATE TABLE IF NOT EXISTS generated_characters (id INTEGER PRIMARY KEY
   AUTOINCREMENT, character TEXT NOT NULL, case_used TEXT NOT NULL, generated_at TEXT NOT NULL)`
   to `createDb()` in `src/db.js`.
4. Verify test passes (GREEN).
5. Commit: "feat: add generated_characters table to schema"

**Files likely touched:**
- `src/db.js` — add table creation
- `test/db.test.js` — new schema assertion

**Dependencies:** none

---

### Task 2: Create character router skeleton and mount it
**Story:** Generate a random character with default mixed case (FR-1, FR-4, FR-6) — scaffolding
**Type:** infrastructure

**Steps:**
1. Write failing test in `test/character.test.js`: `createRouter(db)` is exported from
   `../src/routes/character` and is a function; mounting it in a bare Express app and calling
   `GET /random/character` does not 404 with "Not found" route-missing behavior (i.e. the route is
   registered, even before real logic exists).
2. Verify test fails (RED) — module doesn't exist yet.
3. Implement: create `src/routes/character.js` exporting `createRouter(db)` with a stub
   `router.get('/random/character', ...)` and `router.get('/random/character/history', ...)`
   returning a placeholder 200; mount it in `src/app.js` via
   `app.use('/', createRouter(db))` (reusing the same `db` passed into `createApp(db)`) alongside
   the existing random router mount.
4. Verify test passes (GREEN).
5. Commit: "feat: scaffold character router and mount in app"

**Files likely touched:**
- `src/routes/character.js` (new)
- `src/app.js` — mount new router
- `test/character.test.js` (new)

**Dependencies:** Task 1

---

### Task 3: Implement default mixed-case character generation
**Story:** Generate a random character with default mixed case (FR-1, FR-6)
**Type:** happy-path

**Steps:**
1. Write failing test: `GET /random/character` with no query params returns HTTP 200 and
   `data.character` matching `/^[a-zA-Z]$/`.
2. Verify test fails (RED).
3. Implement: in `src/routes/character.js`, replace the stub with real logic — pick a random index
   into the `mixed` (`a-zA-Z`) charset, return `{ data: { character } }`.
4. Verify test passes (GREEN).
5. Commit: "feat: implement default mixed-case random character generation"

**Files likely touched:**
- `src/routes/character.js`

**Dependencies:** Task 2

---

### Task 4: Implement explicit `case=mixed`
**Story:** Generate a random character with default mixed case (FR-4)
**Type:** happy-path

**Steps:**
1. Write failing test: `GET /random/character?case=mixed` returns HTTP 200 with `data.character`
   matching `/^[a-zA-Z]$/`.
2. Verify test fails (RED) — case param not yet parsed.
3. Implement: add `parseCase(req)` resolving `mixed` (and absence of `case`) to the `a-zA-Z`
   charset.
4. Verify test passes (GREEN).
5. Commit: "feat: support explicit case=mixed parameter"

**Files likely touched:**
- `src/routes/character.js`

**Dependencies:** Task 3

---

### Task 5: Implement `case=upper`
**Story:** Generate a random character restricted to uppercase (FR-2)
**Type:** happy-path

**Steps:**
1. Write failing test: 20 consecutive calls to `GET /random/character?case=upper` all return
   `data.character` matching `/^[A-Z]$/`, HTTP 200.
2. Verify test fails (RED).
3. Implement: extend `parseCase(req)` to resolve `upper` to the `A-Z` charset.
4. Verify test passes (GREEN).
5. Commit: "feat: support case=upper parameter"

**Files likely touched:**
- `src/routes/character.js`

**Dependencies:** Task 4

---

### Task 6: Implement `case=lower`
**Story:** Generate a random character restricted to lowercase (FR-3)
**Type:** happy-path

**Steps:**
1. Write failing test: 20 consecutive calls to `GET /random/character?case=lower` all return
   `data.character` matching `/^[a-z]$/`, HTTP 200.
2. Verify test fails (RED).
3. Implement: extend `parseCase(req)` to resolve `lower` to the `a-z` charset.
4. Verify test passes (GREEN).
5. Commit: "feat: support case=lower parameter"

**Files likely touched:**
- `src/routes/character.js`

**Dependencies:** Task 5

---

### Task 7: Unknown query params are ignored, not rejected
**Story:** Generate a random character restricted to lowercase (FR-3, negative path)
**Type:** negative-path

**Steps:**
1. Write failing test: `GET /random/character?case=lower&foo=bar` returns HTTP 200 with a
   lowercase character (unrelated param does not trigger validation).
2. Verify test fails (RED) if `parseCase` naively inspects all params — otherwise confirm it
   already passes and only the explicit assertion is new.
3. Implement (if needed): ensure `parseCase` only reads `req.query.case` and ignores all other
   query keys.
4. Verify test passes (GREEN).
5. Commit: "test: unrelated query params do not affect case validation"

**Files likely touched:**
- `src/routes/character.js`
- `test/character.test.js`

**Dependencies:** Task 6

---

### Task 8: Reject unsupported `case` values
**Story:** Reject an invalid case parameter (FR-5)
**Type:** negative-path

**Steps:**
1. Write failing test: `GET /random/character?case=digits` returns HTTP 400 with
   `{ "error": { "type": "validation", "message": "case must be one of: upper, lower, mixed" } }`.
2. Verify test fails (RED).
3. Implement: `parseCase(req)` returns a validation-error sentinel for any value not in
   `{upper, lower, mixed}`; the route handler checks for it and responds 400 before generating.
4. Verify test passes (GREEN).
5. Commit: "feat: reject unsupported case values with 400 validation error"

**Files likely touched:**
- `src/routes/character.js`

**Dependencies:** Task 6

---

### Task 9: Reject empty `case` value
**Story:** Reject an invalid case parameter (FR-5)
**Type:** negative-path

**Steps:**
1. Write failing test: `GET /random/character?case=` returns HTTP 400 with the same `validation`
   error envelope as Task 8.
2. Verify test fails (RED) if empty string isn't already covered by the not-in-set check —
   confirm behavior explicitly either way.
3. Implement (if needed): ensure the empty string falls through to the same rejection branch (no
   special-casing of falsy-but-present values).
4. Verify test passes (GREEN).
5. Commit: "test: reject empty case query parameter"

**Files likely touched:**
- `test/character.test.js`
- `src/routes/character.js` (only if a special-case branch is needed)

**Dependencies:** Task 8

---

### Task 10: Reject incorrectly-capitalized `case` values
**Story:** Reject an invalid case parameter (FR-5)
**Type:** negative-path

**Steps:**
1. Write failing test: `GET /random/character?case=Upper` and `?case=UPPER` both return HTTP 400
   with the `validation` error envelope (case-sensitive matching — only exact lowercase literals
   are accepted).
2. Verify test fails (RED) if the implementation accidentally normalizes case.
3. Implement (if needed): confirm `parseCase` compares the raw query value with no
   `.toLowerCase()` normalization.
4. Verify test passes (GREEN).
5. Commit: "test: case parameter matching is case-sensitive"

**Files likely touched:**
- `test/character.test.js`

**Dependencies:** Task 8

---

### Task 11: Reject `POST /random/character`
**Story:** Generate a random character with default mixed case (FR-1, negative path)
**Type:** negative-path

**Steps:**
1. Write failing test: `POST /random/character` returns HTTP 404 with
   `{ "error": { "type": "not_found", "message": "Not found" } }`.
2. Verify test fails (RED) if the 404 catch-all isn't already wired correctly for this path —
   otherwise confirm it passes and lock in the assertion.
3. Implement (if needed): no change expected — `app.js`'s existing 404 catch-all middleware
   already handles unmatched method+path combinations.
4. Verify test passes (GREEN).
5. Commit: "test: POST /random/character returns 404"

**Files likely touched:**
- `test/character.test.js`

**Dependencies:** Task 2

---

### Task 12: Persist generated character before responding
**Story:** Persist every generated character (FR-7)
**Type:** happy-path

**Steps:**
1. Write failing test: after calling `GET /random/character` once against an in-memory db,
   querying `generated_characters` directly returns exactly one row whose `character` matches the
   response body and whose `generated_at` is a valid ISO 8601 string.
2. Verify test fails (RED).
3. Implement: in the `GET /random/character` handler, after selecting the character, run
   `db.prepare('INSERT INTO generated_characters (character, case_used, generated_at) VALUES (?,
   ?, ?)').run(character, resolvedCase, new Date().toISOString())` before sending the response.
4. Verify test passes (GREEN).
5. Commit: "feat: persist generated character to SQLite before responding"

**Files likely touched:**
- `src/routes/character.js`
- `test/character.test.js`

**Dependencies:** Task 1, Task 6

---

### Task 13: Implement empty character history
**Story:** Retrieve character generation history (FR-8)
**Type:** happy-path

**Steps:**
1. Write failing test: against a fresh in-memory db with no generations, `GET
   /random/character/history` returns HTTP 200 with `{ "data": { "characters": [] } }`.
2. Verify test fails (RED).
3. Implement: replace the Task 2 stub handler for `/random/character/history` with a real query:
   `SELECT character, generated_at AS generatedAt FROM generated_characters ORDER BY id DESC`,
   wrapped to return `{ data: { characters: rows } }`.
4. Verify test passes (GREEN).
5. Commit: "feat: implement empty GET /random/character/history"

**Files likely touched:**
- `src/routes/character.js`

**Dependencies:** Task 1, Task 2

---

### Task 14: Implement most-recent-first history ordering
**Story:** Retrieve character generation history (FR-8)
**Type:** happy-path

**Steps:**
1. Write failing test: generate 3 characters in sequence via `GET /random/character`, then call
   `GET /random/character/history`; assert the 3 returned entries are ordered most-recent-first
   (last-generated character appears at index 0), each with `character` and `generatedAt` fields.
2. Verify test fails (RED) if ordering is wrong — otherwise confirm `ORDER BY id DESC` from Task
   13 already satisfies this and lock in the assertion.
3. Implement (if needed): no change expected beyond Task 13's query.
4. Verify test passes (GREEN).
5. Commit: "test: history returns entries most-recent-first"

**Files likely touched:**
- `test/character.test.js`

**Dependencies:** Task 12, Task 13

---

### Task 15: Reject `POST /random/character/history`
**Story:** Retrieve character generation history (FR-8, negative path)
**Type:** negative-path

**Steps:**
1. Write failing test: `POST /random/character/history` returns HTTP 404 with the standard
   not_found envelope.
2. Verify test fails (RED) if unhandled — otherwise confirm it passes via the existing catch-all.
3. Implement (if needed): none expected.
4. Verify test passes (GREEN).
5. Commit: "test: POST /random/character/history returns 404"

**Files likely touched:**
- `test/character.test.js`

**Dependencies:** Task 13

---

### Task 16: Handle DB failure on `GET /random/character`
**Story:** Graceful degradation when the database is unavailable (FR-9)
**Type:** negative-path

**Steps:**
1. Write failing test: using a `createFallbackDb()`-style stub whose `prepare()` throws,
   `GET /random/character` returns HTTP 500 with
   `{ "error": { "type": "internal", "message": "Internal server error" } }`, and the test
   process does not crash.
2. Verify test fails (RED).
3. Implement: wrap the `GET /random/character` handler body in try/catch, mirroring
   `src/routes/random.js`'s existing pattern, catching any error from `prepare()`/`run()` and
   responding 500 with the `internal` envelope.
4. Verify test passes (GREEN).
5. Commit: "fix: wrap GET /random/character handler in try/catch for DB failures"

**Files likely touched:**
- `src/routes/character.js`
- `test/character.test.js`

**Dependencies:** Task 12

---

### Task 17: Handle DB failure on `GET /random/character/history`
**Story:** Graceful degradation when the database is unavailable (FR-9)
**Type:** negative-path

**Steps:**
1. Write failing test: using the same throwing DB stub as Task 16, `GET
   /random/character/history` returns HTTP 500 with the `internal` error envelope, and the test
   process does not crash.
2. Verify test fails (RED).
3. Implement: wrap the `GET /random/character/history` handler body in try/catch identically to
   Task 16.
4. Verify test passes (GREEN).
5. Commit: "fix: wrap GET /random/character/history handler in try/catch for DB failures"

**Files likely touched:**
- `src/routes/character.js`
- `test/character.test.js`

**Dependencies:** Task 13, Task 16

## Task Dependency Graph

```
1 ─┬─> 2 ─┬─> 3 ─> 4 ─> 5 ─> 6 ─┬─> 7
   │      │                     ├─> 8 ─┬─> 9
   │      │                     │      └─> 10
   │      └─> 11                └─> 12 ─┬─> 16
   └───────────────────────────────────┤
                                        └─> 13 ─┬─> 14
                                                 ├─> 15
                                                 └─> 17 (also needs 16)
```

## Integration Points

- After Task 2: app starts with both routers mounted; manual smoke test of route registration.
- After Task 6: full happy-path character generation (all three case modes) is end-to-end
  testable via curl.
- After Task 10: all `case` validation behavior is complete and end-to-end testable.
- After Task 12: persistence is verifiable by querying the DB directly after a generation call.
- After Task 14: the full history feature (empty + populated + ordering) is end-to-end testable.
- After Task 17: full feature, including DB-unavailable degradation, is complete.

## Coverage Mapping

| Story | Acceptance Criterion | Task(s) |
|---|---|---|
| Default mixed case | Happy: no params → mixed char | 3 |
| Default mixed case | Happy: `case=mixed` → mixed char | 4 |
| Default mixed case | Negative: `POST` → 404 | 11 |
| Uppercase | Happy: `case=upper` → A-Z | 5 |
| Uppercase | Negative: `case=UPPER` → 400 | 10 |
| Lowercase | Happy: `case=lower` → a-z | 6 |
| Lowercase | Negative: unrelated param ignored | 7 |
| Reject invalid case | Happy: omitted `case` not an error | 3, 4 |
| Reject invalid case | Negative: `case=digits` → 400 | 8 |
| Reject invalid case | Negative: `case=` → 400 | 9 |
| Reject invalid case | Negative: `case=Upper` → 400 | 10 |
| Persist character | Happy: row inserted before response | 12 |
| Persist character | Negative: DB failure does not leave partial state | 16 |
| Character history | Happy: empty history | 13 |
| Character history | Happy: 3 generations, most-recent-first | 14 |
| Character history | Negative: `POST` → 404 | 15 |
| DB unavailable | Negative: `/random/character` → 500 | 16 |
| DB unavailable | Negative: `/random/character/history` → 500 | 17 |

## Verification

- [x] All happy path criteria covered by at least one task
- [x] All negative path criteria covered by at least one task
- [x] No task exceeds 5 minutes of work
- [x] Dependencies are explicit and acyclic
