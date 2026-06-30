**Status:** Accepted

---

## Story: Persist Number on Generation

**Requirement:** FR-1, FR-6

As an API consumer, I want every random number I receive to be durably saved so that I can
audit what was generated even after a server restart.

### Acceptance Criteria

#### Happy Path
- Given the server is running with a connected SQLite database, when `GET /random` is called,
  then it returns HTTP 200 with `{ "data": { "number": N } }` (unchanged format) AND a row for
  N with a UTC timestamp is written to `generated_numbers` before the response is sent.

#### Negative Paths
- Given the database is unavailable (e.g., file permissions error on startup), when `GET /random`
  is called, then the server returns HTTP 500 with `{ "error": { "type": "internal", "message":
  "Internal server error" } }` and no number is returned to the caller (write-before-respond
  guarantee — no number without a persisted record).

### Done When
- [ ] `GET /random` returns `{ "data": { "number": N } }` — response shape byte-for-byte identical to current
- [ ] Row exists in `generated_numbers` table with `number = N` and a non-null `generated_at` ISO-8601 UTC string
- [ ] Row is written before the HTTP response is sent (verified by ordering in implementation)

---

## Story: Retrieve History of Generated Numbers

**Requirement:** FR-2, FR-3

As an API consumer, I want to call `GET /random/history` to see all previously generated
numbers so that I can review what was produced in past sessions.

### Acceptance Criteria

#### Happy Path
- Given N numbers have been generated via `GET /random`, when `GET /random/history` is called,
  then it returns HTTP 200 with `{ "data": { "numbers": [...] } }` containing exactly N entries,
  ordered from most recent to oldest.
- Given history entries exist, when the response is inspected, then each entry has an integer
  `number` field and an ISO-8601 UTC `generatedAt` string field, matching the values that were
  returned by `GET /random`.

#### Negative Paths
- Given a `POST /random/history` request is made, when the server processes it, then it returns
  HTTP 404 with the standard `{ "error": { "type": "not_found", "message": "Not found" } }`
  envelope — history is read-only.

### Done When
- [ ] `GET /random/history` returns HTTP 200 with `{ "data": { "numbers": [...] } }`
- [ ] Entries are in descending order of `generatedAt` (most recent first)
- [ ] Each entry shape: `{ "number": <integer>, "generatedAt": "<ISO-8601 UTC string>" }`
- [ ] Entry count matches the number of times `GET /random` was called

---

## Story: Empty History Returns Empty Array

**Requirement:** FR-4

As an API consumer, I want `GET /random/history` to return an empty list when no numbers have
been generated yet so that I do not receive an error on a fresh database.

### Acceptance Criteria

#### Happy Path
- Given no numbers have been generated since the database was initialized, when
  `GET /random/history` is called, then it returns HTTP 200 with
  `{ "data": { "numbers": [] } }`.

#### Negative Paths
- Given no numbers have been generated, when `GET /random/history` is called, then it returns
  HTTP 200 (not HTTP 404) — an empty history is a valid state, not a missing resource.

### Done When
- [ ] `GET /random/history` returns HTTP 200 on a fresh database
- [ ] Response body is `{ "data": { "numbers": [] } }`

---

## Story: History Persists Across Server Restarts

**Requirement:** FR-5

As an API consumer, I want the history of generated numbers to survive a server restart so
that I can audit numbers from previous runs.

### Acceptance Criteria

#### Happy Path
- Given N numbers were generated before the server was stopped, when the server is restarted
  and `GET /random/history` is called, then all N entries are still present in the response.

#### Negative Paths
- Given the SQLite DB file is deleted between runs, when the server starts, then it initializes
  a fresh database and `GET /random/history` returns `{ "data": { "numbers": [] } }` — the
  server does not crash on a missing DB file.

### Done When
- [ ] Numbers generated before a restart are present in history after the restart
- [ ] Server starts cleanly when the DB file does not yet exist (auto-creates it)
