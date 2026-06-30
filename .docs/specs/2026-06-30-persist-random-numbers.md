# Design Doc: Persist Generated Random Numbers

**Date:** 2026-06-30  
**Status:** Approved  
**Author:** james.stoup@upstart.com

---

## Problem / Background

The `/random` endpoint currently generates numbers with no persistence. Every number generated
is lost when the server restarts, and there is no way to review what numbers have been
produced. Operators want a durable record of every generated number for auditability and
replay purposes.

---

## Goals & Non-Goals

**Goals:**
- Save every generated random number (and when it was generated) to durable storage.
- Expose a read-only endpoint to retrieve the full history of generated numbers.

**Non-Goals (MVP):**
- Pagination or cursor-based retrieval.
- Filtering by date range or value.
- Deleting or clearing history.
- Capping or rotating history size.
- Exporting history in alternate formats.

---

## Users / Personas

**API consumer** — calls `GET /random` to get numbers; occasionally queries history to review
what was produced during a session or after a restart.

---

## Functional Requirements

**FR-1:** When `GET /random` returns a number, that number and the UTC timestamp of generation
are atomically written to the persistent store before the response is sent to the caller.

**FR-2:** A new endpoint `GET /random/history` returns all previously persisted numbers in
descending order of generation time (most recent first).

**FR-3:** Each entry in the history response includes the integer `number` and an ISO-8601
UTC `generatedAt` timestamp.

**FR-4:** When no numbers have been generated yet, `GET /random/history` returns an empty
array with HTTP 200 — not a 404 or error.

**FR-5:** A server restart must not lose any numbers that were successfully returned to callers
before the restart (i.e., persistence is to disk, not in-memory).

**FR-6:** The `GET /random` response format is unchanged — persistence must be transparent
to existing callers.

---

## Non-Functional Requirements

- **Correctness:** No number is returned to a caller without first being written to the store.
- **Simplicity:** No async complexity introduced — use `better-sqlite3`'s synchronous API.
- **Testability:** App constructed via `createApp(db)` factory so tests pass an in-memory DB
  without touching disk.

---

## Acceptance Criteria / Success Metrics

- Calling `GET /random` N times then `GET /random/history` returns exactly N entries.
- After a server restart, `GET /random/history` still returns all numbers generated before
  the restart.
- `GET /random` response body is byte-for-byte identical to current behavior.
- `GET /random/history` on an empty database returns `{ "data": { "numbers": [] } }`.

---

## Approach

**SQLite via `better-sqlite3`** — consistent with the established project pattern.

- Single table: `generated_numbers (id INTEGER PRIMARY KEY AUTOINCREMENT, number INTEGER NOT NULL, generated_at TEXT NOT NULL)`.
- `generated_at` stored as ISO-8601 UTC string.
- DB file: `random_numbers.db` in project root (git-ignored).
- `createApp(db)` factory receives the DB connection; tests pass `:memory:` DB.

Alternatives considered and rejected:
- **In-memory array** — not durable across restarts (violates FR-5).
- **Flat file (JSON/CSV)** — no atomic writes, harder to query, no established pattern in project.

---

## API Contract Amendment

The existing contract (`.docs/decisions/api-response-contract.md`) specifies
"single-value responses only." `GET /random/history` returns an array. This is an intentional
MVP extension — the contract's spirit (consistent envelope, no auth) is preserved.

**`GET /random/history` — success response:**
```json
{
  "data": {
    "numbers": [
      { "number": 42, "generatedAt": "2026-06-30T14:00:00.000Z" },
      { "number": 17, "generatedAt": "2026-06-30T13:59:55.123Z" }
    ]
  }
}
```

---

## Scope

**In:**
- SQLite persistence of every `GET /random` result
- `GET /random/history` endpoint

**Out:**
- Pagination, filtering, deletion, export
- Schema migrations (new project, single migration)

---

## Key Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| `better-sqlite3` over async drivers | Sync API matches existing pattern; avoids async complexity for local use |
| Write before respond | Guarantees no number is returned without being persisted |
| Descending order for history | Most recent numbers are most useful to consumers |
| Array under `data.numbers` key | Keeps envelope consistent; discriminates from single-value responses |

---

## Dependencies

- `better-sqlite3` npm package (to be added)

---

## Open Questions

_None for MVP._
