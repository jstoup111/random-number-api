# Implementation Plan: Persist Generated Random Numbers

**Date:** 2026-06-30  
**Design:** `.docs/specs/2026-06-30-persist-random-numbers.md`  
**Stories:** `.docs/stories/persist-random-numbers.md`  
**Conflict check:** N/A (Tier S — skipped per complexity assessment)

---

## Summary

Adds SQLite persistence to `GET /random` (write-before-respond) and a new `GET /random/history`
endpoint. 8 tasks covering infrastructure, refactoring to `createApp(db)` factory, happy paths,
and negative paths.

---

## Technical Approach

- Install `better-sqlite3`. Create `src/db.js` that exports `createDb(path)` — opens/creates a
  SQLite DB at `path` and initialises the `generated_numbers` table if absent.
- Refactor `src/app.js` to `createApp(db)` and `src/routes/random.js` to `createRouter(db)` so
  both close over the injected DB connection. Tests pass `createDb(':memory:')`.
- `index.js` creates a real on-disk DB (`random_numbers.db`, git-ignored) and passes it to
  `createApp(db)`.
- The `GET /random` handler inserts a row (`number`, `generated_at` ISO-8601 UTC) **before**
  `res.json(...)` — guarantees no number is returned without a persisted record.
- `GET /random/history` queries `generated_numbers ORDER BY id DESC` and maps rows to
  `{ number, generatedAt }` under `data.numbers`.
- All existing tests are updated to use the factory with an in-memory DB; existing behaviour
  is unchanged.

---

## Prerequisites

- Node.js project at `/Users/james.stoup/code/test/random-number-api`
- `better-sqlite3` not yet installed

---

## Tasks

### Task 1: Add better-sqlite3 and create DB module
**Story:** FR-1 (infrastructure prerequisite), FR-5  
**Type:** infrastructure

**Steps:**
1. Write failing test in `test/db.test.js`: `createDb(':memory:')` returns an object, and `SELECT name FROM sqlite_master WHERE type='table' AND name='generated_numbers'` returns one row.
2. Verify test fails (RED — module does not exist yet).
3. Run `npm install better-sqlite3`.
4. Create `src/db.js`:
   ```js
   const Database = require('better-sqlite3');
   function createDb(path) {
     const db = new Database(path);
     db.exec(`CREATE TABLE IF NOT EXISTS generated_numbers (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       number INTEGER NOT NULL,
       generated_at TEXT NOT NULL
     )`);
     return db;
   }
   module.exports = { createDb };
   ```
5. Verify test passes (GREEN).
6. Add `random_numbers.db` to `.gitignore`.
7. Commit: `feat: add better-sqlite3 and db schema module`.

**Files likely touched:**
- `src/db.js` — new
- `test/db.test.js` — new
- `package.json` — add better-sqlite3 dependency
- `.gitignore` — add random_numbers.db

**Dependencies:** none

---

### Task 2: Refactor app and router to factory pattern (createApp/createRouter)
**Story:** FR-1, FR-6 (testability prerequisite)  
**Type:** infrastructure / refactor

**Steps:**
1. Write failing tests: update `test/app.test.js` to call `createApp(db)` with `createDb(':memory:')` and verify the same behaviour as before (404 catch-all, JSON envelope).
2. Verify tests fail (RED — `createApp` not yet exported).
3. Refactor `src/routes/random.js`: change to `createRouter(db)` function that returns a router closing over `db`. Preserve `router._reset` and `router._getLastNumber` on the returned router.
4. Refactor `src/app.js`: export `createApp(db)` that calls `createRouter(db)` and wires middleware.
5. Update `index.js`: `const { createApp } = require('./src/app'); const { createDb } = require('./src/db'); const db = createDb('random_numbers.db'); const app = createApp(db); ...`
6. Update `test/random.test.js`: import `createApp` and `createRouter`, create `createDb(':memory:')`, pass to both.
7. Update `test/app.test.js` and `test/server.test.js` similarly where `app` is imported.
8. Run `npm test` — all existing tests must pass.
9. Verify GREEN.
10. Commit: `refactor: createApp(db) and createRouter(db) factory pattern`.

**Files likely touched:**
- `src/app.js` — refactor to factory
- `src/routes/random.js` — refactor to factory
- `index.js` — use factories with real DB
- `test/app.test.js` — update imports and DB injection
- `test/random.test.js` — update imports and DB injection
- `test/server.test.js` — update if it imports app directly

**Dependencies:** Task 1

---

### Task 3: Happy path — persist number in GET /random (FR-1, FR-6)
**Story:** Story "Persist Number on Generation" — happy path  
**Type:** happy-path

**Steps:**
1. Write failing test in `test/random.test.js`: after `GET /random`, query the in-memory DB with `db.prepare('SELECT * FROM generated_numbers').all()`, expect one row with `number` matching the response and `generated_at` being a valid ISO-8601 UTC string.
2. Verify test fails (RED — no DB write yet).
3. In `createRouter(db)`, before `res.json(...)`, add:
   ```js
   db.prepare('INSERT INTO generated_numbers (number, generated_at) VALUES (?, ?)')
     .run(number, new Date().toISOString());
   ```
4. Verify test passes (GREEN).
5. Verify existing response-format test still passes (response shape unchanged).
6. Commit: `feat: persist generated number to SQLite before responding`.

**Files likely touched:**
- `src/routes/random.js` — add INSERT before res.json
- `test/random.test.js` — add persistence assertion test

**Dependencies:** Task 2

---

### Task 4: Happy path — GET /random/history returns numbers descending (FR-2, FR-3)
**Story:** Story "Retrieve History of Generated Numbers" — happy path  
**Type:** happy-path

**Steps:**
1. Write failing test: generate 3 numbers via `GET /random`, then call `GET /random/history`, expect HTTP 200 with body `{ data: { numbers: [<newest>, <middle>, <oldest>] } }` where each entry has `number` (integer) and `generatedAt` (string).
2. Verify test fails (RED — route does not exist).
3. In `createRouter(db)`, add:
   ```js
   router.get('/random/history', (req, res) => {
     const rows = db.prepare(
       'SELECT number, generated_at AS generatedAt FROM generated_numbers ORDER BY id DESC'
     ).all();
     res.json({ data: { numbers: rows } });
   });
   ```
4. Verify test passes (GREEN).
5. Commit: `feat: add GET /random/history endpoint`.

**Files likely touched:**
- `src/routes/random.js` — add history route
- `test/random.test.js` — add history tests

**Dependencies:** Task 3

---

### Task 5: Happy path — empty history returns empty array (FR-4)
**Story:** Story "Empty History Returns Empty Array" — happy path  
**Type:** happy-path

**Steps:**
1. Write failing test: fresh in-memory DB (no prior calls), `GET /random/history` → HTTP 200 with `{ data: { numbers: [] } }`.
2. Verify test result (likely GREEN already after Task 4 — the SELECT returns zero rows, which maps to `[]`). If GREEN, commit directly.
3. Confirm HTTP status is 200 (not 404) by explicit assertion.
4. Commit: `test: empty history returns 200 with empty array`.

**Files likely touched:**
- `test/random.test.js` — add empty-state test

**Dependencies:** Task 4

---

### Task 6: Negative path — POST /random/history returns 404 (FR-2 negative)
**Story:** Story "Retrieve History of Generated Numbers" — negative path  
**Type:** negative-path

**Steps:**
1. Write failing test: `POST /random/history` → HTTP 404 with `{ error: { type: 'not_found', message: 'Not found' } }`.
2. Verify test result (likely GREEN already — 404 catch-all handles unknown methods). If GREEN, commit directly.
3. Commit: `test: POST /random/history returns 404`.

**Files likely touched:**
- `test/random.test.js` — add wrong-method test for history

**Dependencies:** Task 4

---

### Task 7: Negative path — DB write failure returns 500 (FR-1 negative)
**Story:** Story "Persist Number on Generation" — negative path  
**Type:** negative-path

**Steps:**
1. Write failing test: mock `db.prepare` to throw, call `GET /random`, expect HTTP 500 with `{ error: { type: 'internal', message: 'Internal server error' } }` and no `data.number` in the response.
2. Verify test fails (RED — currently the error propagates unhandled).
3. Wrap the INSERT + `res.json` block in `createRouter(db)` in a try/catch:
   ```js
   try {
     db.prepare('INSERT INTO generated_numbers (number, generated_at) VALUES (?, ?)')
       .run(number, new Date().toISOString());
     res.json({ data: { number } });
   } catch (err) {
     res.status(500).json({ error: { type: 'internal', message: 'Internal server error' } });
   }
   ```
4. Verify test passes (GREEN).
5. Commit: `feat: return 500 on DB write failure in GET /random`.

**Files likely touched:**
- `src/routes/random.js` — add try/catch around INSERT + respond
- `test/random.test.js` — add DB-failure test

**Dependencies:** Task 3

---

### Task 8: Negative path — server starts cleanly when DB file absent (FR-5 negative)
**Story:** Story "History Persists Across Server Restarts" — negative path  
**Type:** negative-path

**Steps:**
1. Write test in `test/db.test.js`: call `createDb` with a path that does not exist (e.g., a temp path), verify it succeeds and the table is created — `better-sqlite3` auto-creates the file.
2. Verify test passes (GREEN — `CREATE TABLE IF NOT EXISTS` handles this already).
3. Commit: `test: createDb auto-creates DB file when absent`.

**Files likely touched:**
- `test/db.test.js` — add auto-create test

**Dependencies:** Task 1

---

## Task Dependency Graph

```
Task 1 (db module)
  └─▶ Task 2 (factory refactor)
        └─▶ Task 3 (persist on GET /random)
              ├─▶ Task 4 (history endpoint)
              │     ├─▶ Task 5 (empty history)
              │     └─▶ Task 6 (POST 404)
              └─▶ Task 7 (DB write failure → 500)
  └─▶ Task 8 (auto-create DB file) [independent of Task 2+]
```

---

## Integration Points

- After Task 2: all existing tests pass with in-memory DB — verify with `npm test`
- After Task 3: `GET /random` is fully persistence-wired; end-to-end curl test confirms row in DB
- After Task 4: full feature is end-to-end testable: generate numbers, retrieve history

---

## Coverage Mapping

| Acceptance Criterion | Task |
|---|---|
| GET /random response unchanged (FR-6 happy) | Task 3 |
| Row written before response (FR-1 happy) | Task 3 |
| DB write failure → 500, no number returned (FR-1 negative) | Task 7 |
| History returns N entries descending (FR-2, FR-3 happy) | Task 4 |
| Each entry has `number` + `generatedAt` (FR-3) | Task 4 |
| POST /random/history → 404 (FR-2 negative) | Task 6 |
| Empty DB → 200 + `[]` (FR-4 happy) | Task 5 |
| Empty DB → 200 not 404 (FR-4 negative) | Task 5 |
| Numbers survive restart (FR-5 happy) | Tasks 1+2+3 (disk DB in index.js) |
| Server starts cleanly, no DB file (FR-5 negative) | Task 8 |

---

## Verification

- [x] All happy path criteria covered by at least one task
- [x] All negative path criteria covered by at least one task
- [x] No task exceeds 5 minutes of work
- [x] Dependencies are explicit and acyclic
- [x] Negative paths are explicit tasks (Tasks 6, 7, 8)
