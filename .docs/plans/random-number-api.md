# Implementation Plan: Random Number API

**Date:** 2026-06-30
**Design:** .docs/specs/2026-06-30-random-number-api.md
**Stories:** .docs/stories/random-number-api.md
**Conflict check:** Skipped (Tier S)

## Summary

Builds a three-file Node/Express API with a single `GET /random` endpoint and a 404 catch-all.
8 tasks covering all happy and negative paths.

## Technical Approach

Three-file structure: `index.js` owns server startup and port resolution; `src/app.js` owns
Express configuration and middleware wiring; `src/routes/random.js` owns the `/random` handler.
The 404 catch-all lives in `src/app.js` as the last registered middleware — Express evaluates
middleware in registration order, so it naturally catches all unmatched routes.

Tests use Jest + Supertest. `src/app.js` exports the Express app (not a running server) so
Supertest can mount it without opening a real port. `index.js` is the only file that calls
`app.listen`, keeping it out of the test surface. PORT validation is tested via a child
process in `test/server.test.js`.

Build order: infrastructure → app skeleton → happy-path features → negative-path tests →
port configuration.

## Prerequisites

- Node.js >= 18 installed
- `npm` available

## Tasks

### Task 1: Init project
**Story:** Infrastructure
**Type:** infrastructure

**Steps:**
1. Run `npm init -y` in the project root
2. Install dependencies: `npm install express`
3. Install dev dependencies: `npm install --save-dev jest supertest`
4. Add `"test": "jest"` to `package.json` scripts
5. Verify `npm test` runs (zero tests pass is fine at this point)

**Files likely touched:**
- `package.json` — init + add scripts and deps

**Dependencies:** none

---

### Task 2: Express app skeleton
**Story:** Infrastructure
**Type:** infrastructure

**Steps:**
1. Write failing test: `src/app.js` can be required without throwing
2. Verify test fails (RED)
3. Create `src/app.js` — instantiate Express, export app (do NOT call `app.listen`)
4. Create `index.js` — require `src/app.js`, call `app.listen(PORT || 3000)` with a console.log
5. Create `src/routes/` directory
6. Verify test passes (GREEN)
7. Commit: "chore: express app skeleton"

**Files likely touched:**
- `src/app.js` — Express instance, exported
- `index.js` — server entry point
- `src/routes/` — empty directory (add `.gitkeep`)

**Dependencies:** Task 1

---

### Task 3: GET /random returns number in [1, 100]
**Story:** Get a Random Number — happy path
**Type:** happy-path

**Steps:**
1. Write failing test: `GET /random` returns 200 with body `{ data: { number: N } }` where N is an integer in [1, 100]
2. Write additional test: call `GET /random` 5 times, assert all N values are in [1, 100]
3. Verify tests fail (RED)
4. Create `src/routes/random.js` — handler that returns `Math.floor(Math.random() * 100) + 1`
5. Mount router in `src/app.js`: `app.use('/', randomRouter)`
6. Verify tests pass (GREEN)
7. Commit: "feat: GET /random returns random number in [1, 100]"

**Files likely touched:**
- `src/routes/random.js` — GET /random handler
- `src/app.js` — mount random router
- `test/random.test.js` — happy-path tests

**Dependencies:** Task 2

---

### Task 4: 404 catch-all returns JSON error envelope
**Story:** Unknown Route Returns 404 — happy path
**Type:** happy-path

**Steps:**
1. Write failing tests:
   - `GET /nonexistent` → 404 with body `{ error: { type: "not_found", message: "Not found" } }`
   - `GET /random/extra/segments` → 404 same body
   - Response `Content-Type` includes `application/json`
2. Verify tests fail (RED)
3. Add catch-all middleware to `src/app.js` after all routes:
   `app.use((req, res) => res.status(404).json({ error: { type: 'not_found', message: 'Not found' } }))`
4. Verify tests pass (GREEN)
5. Commit: "feat: 404 catch-all returns JSON error envelope"

**Files likely touched:**
- `src/app.js` — catch-all middleware (must be last)
- `test/app.test.js` — 404 tests

**Dependencies:** Task 3 (router must be mounted before catch-all is verified)

---

### Task 5: POST /random returns 404 error envelope
**Story:** Get a Random Number — negative path
**Type:** negative-path

**Steps:**
1. Write failing test: `POST /random` returns 404 with body `{ error: { type: "not_found", message: "Not found" } }`
2. Verify test fails (RED) — Express default 404 may not return JSON envelope yet
3. No new implementation needed if Task 4's catch-all is in place; verify it handles all methods
4. Verify test passes (GREEN)
5. Commit: "test: POST /random falls through to 404 catch-all"

**Files likely touched:**
- `test/random.test.js` — negative-path test for wrong HTTP method

**Dependencies:** Task 4

---

### Task 6: DELETE /anything returns JSON, not HTML
**Story:** Unknown Route Returns 404 — negative path
**Type:** negative-path

**Steps:**
1. Write failing test: `DELETE /anything` → 404, `Content-Type: application/json`, body is error envelope (not HTML)
2. Verify test fails (RED)
3. No new implementation if catch-all covers all methods; verify and fix if not
4. Verify test passes (GREEN)
5. Commit: "test: catch-all returns JSON for all HTTP methods"

**Files likely touched:**
- `test/app.test.js` — negative-path test

**Dependencies:** Task 4

---

### Task 7: PORT env var configures listening port
**Story:** Configurable Server Port — happy path
**Type:** happy-path

**Steps:**
1. Write failing test: spawn `index.js` with `PORT=0` (OS-assigned), capture stdout, assert log contains "Listening on port"
2. Verify test fails (RED)
3. Update `index.js`: `const PORT = process.env.PORT || 3000; app.listen(PORT, () => console.log(\`Listening on port ${PORT}\`))`
4. Verify test passes (GREEN)
5. Commit: "feat: configurable port via PORT env var with startup log"

**Files likely touched:**
- `index.js` — PORT resolution and startup log
- `test/server.test.js` — child-process test for port config

**Dependencies:** Task 2

---

### Task 8: PORT=abc causes non-zero exit
**Story:** Configurable Server Port — negative path
**Type:** negative-path

**Steps:**
1. Write failing test: spawn `index.js` with `PORT=abc`, assert process exits with non-zero code
2. Verify test fails (RED)
3. Add port validation to `index.js`: if `PORT` is set and not a valid integer, log error and `process.exit(1)`
4. Verify test passes (GREEN)
5. Commit: "feat: exit non-zero on invalid PORT value"

**Files likely touched:**
- `index.js` — port validation guard
- `test/server.test.js` — negative-path test

**Dependencies:** Task 7

---

## Task Dependency Graph

```
Task 1 (init)
  └── Task 2 (skeleton)
        ├── Task 3 (GET /random happy)
        │     └── Task 4 (404 catch-all)
        │           ├── Task 5 (POST /random → 404)
        │           └── Task 6 (DELETE → JSON 404)
        └── Task 7 (PORT config)
              └── Task 8 (PORT=abc → exit 1)
```

## Integration Points

- After Task 3: `GET /random` works end-to-end via `curl localhost:3000/random`
- After Task 4: full catch-all behavior verifiable manually
- After Task 8: all stories and acceptance criteria covered

## Coverage Mapping

| Acceptance Criterion | Task |
|---|---|
| GET /random → 200 + { data: { number: N } } | Task 3 |
| N in [1, 100] across multiple calls | Task 3 |
| POST /random → 404 error envelope | Task 5 |
| GET /nonexistent → 404 error envelope | Task 4 |
| GET /random/extra → 404 error envelope | Task 4 |
| DELETE /anything → JSON not HTML | Task 6 |
| No PORT → 3000, logs port | Task 7 |
| PORT=4000 → listens on 4000, logs port | Task 7 |
| PORT=abc → process exits non-zero | Task 8 |

## Verification

- [x] All happy path criteria covered by at least one task
- [x] All negative path criteria covered by at least one task (Tasks 5, 6, 8)
- [x] No task exceeds 5 minutes of work
- [x] Dependencies are explicit and acyclic
