**Status:** Accepted

## Story: Generate a random character with default mixed case

**Requirement:** FR-1, FR-4, FR-6

As an API consumer, I want to call `GET /random/character` with no parameters (or with
`case=mixed` explicitly) so that I get a single random letter drawn from both cases.

### Acceptance Criteria

#### Happy Path
- Given no query parameters, when I call `GET /random/character`, then I receive HTTP 200 with
  `{ "data": { "character": "X" } }` where `X` is a single character in `[a-zA-Z]`.
- Given `case=mixed`, when I call `GET /random/character?case=mixed`, then I receive HTTP 200 with
  a single character in `[a-zA-Z]` (same behavior as the default).

#### Negative Paths
- Given an unsupported HTTP method, when I call `POST /random/character`, then I receive HTTP 404
  with `{ "error": { "type": "not_found", "message": "Not found" } }`.

### Done When
- [ ] `GET /random/character` returns HTTP 200 with a `data.character` field that is exactly one
      character matching `/^[a-zA-Z]$/`
- [ ] `GET /random/character?case=mixed` returns the same response shape and character range
- [ ] `POST /random/character` returns HTTP 404 with the standard not_found envelope

---

## Story: Generate a random character restricted to uppercase

**Requirement:** FR-2

As an API consumer, I want to call `GET /random/character?case=upper` so that I always get an
uppercase letter.

### Acceptance Criteria

#### Happy Path
- Given `case=upper`, when I call `GET /random/character?case=upper` repeatedly (20 calls), then
  every returned `character` matches `/^[A-Z]$/` and the response is HTTP 200.

#### Negative Paths
- Given `case=UPPER` (wrong casing on the param value itself), when I call
  `GET /random/character?case=UPPER`, then I receive HTTP 400 with
  `{ "error": { "type": "validation", "message": "case must be one of: upper, lower, mixed" } }`
  (parameter values are case-sensitive; only the exact literals `upper`, `lower`, `mixed` are
  accepted).

### Done When
- [ ] 20 consecutive calls to `GET /random/character?case=upper` all return characters matching
      `/^[A-Z]$/` with HTTP 200
- [ ] `GET /random/character?case=UPPER` returns HTTP 400 with the `validation` error envelope

---

## Story: Generate a random character restricted to lowercase

**Requirement:** FR-3

As an API consumer, I want to call `GET /random/character?case=lower` so that I always get a
lowercase letter.

### Acceptance Criteria

#### Happy Path
- Given `case=lower`, when I call `GET /random/character?case=lower` repeatedly (20 calls), then
  every returned `character` matches `/^[a-z]$/` and the response is HTTP 200.

#### Negative Paths
- Given `case=lower` combined with an unrelated unknown query parameter (e.g. `?case=lower&foo=bar`),
  when I call the endpoint, then the unknown parameter is ignored and the request still succeeds
  with HTTP 200 and a lowercase character (unknown params are not validation errors).

### Done When
- [ ] 20 consecutive calls to `GET /random/character?case=lower` all return characters matching
      `/^[a-z]$/` with HTTP 200
- [ ] `GET /random/character?case=lower&foo=bar` returns HTTP 200 with a lowercase character

---

## Story: Reject an invalid case parameter

**Requirement:** FR-5

As an API consumer, I want clear feedback when I pass an unsupported `case` value so that I can
fix my request instead of silently receiving unexpected behavior.

### Acceptance Criteria

#### Happy Path
- Given `case` is omitted entirely, when I call `GET /random/character`, then no validation error
  occurs (covered by the default-case story) — included here to confirm omission is not treated
  as invalid.

#### Negative Paths
- Given `case=digits`, when I call `GET /random/character?case=digits`, then I receive HTTP 400
  with `{ "error": { "type": "validation", "message": "case must be one of: upper, lower, mixed" } }`.
- Given `case=` (empty string), when I call `GET /random/character?case=`, then I receive HTTP 400
  with the same `validation` error envelope.
- Given `case=Upper` (incorrect capitalization), when I call `GET /random/character?case=Upper`,
  then I receive HTTP 400 with the same `validation` error envelope.

### Done When
- [ ] `GET /random/character?case=digits` returns HTTP 400 with `error.type === "validation"`
- [ ] `GET /random/character?case=` returns HTTP 400 with `error.type === "validation"`
- [ ] `GET /random/character?case=Upper` returns HTTP 400 with `error.type === "validation"`
- [ ] `GET /random/character` (no `case`) returns HTTP 200, not HTTP 400

---

## Story: Persist every generated character

**Requirement:** FR-7

As the system, I want every successfully generated character persisted to SQLite before the
response is returned, so that the generation history is durable and queryable.

### Acceptance Criteria

#### Happy Path
- Given a fresh in-memory database, when I call `GET /random/character`, then a row is inserted
  into `generated_characters` containing the returned character and a generation timestamp before
  the HTTP response is sent.

#### Negative Paths
- Given the underlying database connection throws on `prepare()`/`run()` (e.g. via
  `createFallbackDb`), when I call `GET /random/character`, then no character is returned, no
  partial row is left in an inconsistent state, and the request fails over to the database-error
  handling described in the "Graceful degradation when the database is unavailable" story (this
  story does not duplicate that error-path assertion — it only confirms persistence on the
  success path).

### Done When
- [ ] After calling `GET /random/character` once, querying `generated_characters` returns exactly
      one new row with a `character` value matching the response body
- [ ] The persisted row's `generated_at` is a valid ISO 8601 timestamp

---

## Story: Retrieve character generation history

**Requirement:** FR-8

As an API consumer, I want to call `GET /random/character/history` so that I can see previously
generated characters, most recent first.

### Acceptance Criteria

#### Happy Path
- Given no characters have ever been generated, when I call `GET /random/character/history`, then
  I receive HTTP 200 with `{ "data": { "characters": [] } }`.
- Given three characters were generated via `GET /random/character` (in order: A, B, C), when I
  call `GET /random/character/history`, then I receive HTTP 200 with `characters` ordered
  most-recent-first: `[C, B, A]` (by `generatedAt`/insertion order).

#### Negative Paths
- Given an unsupported HTTP method, when I call `POST /random/character/history`, then I receive
  HTTP 404 with `{ "error": { "type": "not_found", "message": "Not found" } }`.

### Done When
- [ ] Empty history returns HTTP 200 with `data.characters` as an empty array
- [ ] After 3 generations, `GET /random/character/history` returns 3 entries in
      most-recent-first order, each with `character` and `generatedAt` fields
- [ ] `POST /random/character/history` returns HTTP 404

---

## Story: Graceful degradation when the database is unavailable

**Requirement:** FR-9

As an API consumer, I want a clear, consistent error when the database backing character
generation/history is unreachable, instead of an unhandled crash.

### Acceptance Criteria

#### Happy Path
- Given a healthy database connection, when I call either `GET /random/character` or
  `GET /random/character/history`, then the request succeeds as described in the other stories
  (included here only to anchor the contrast with the failure case below).

#### Negative Paths
- Given the database connection is a fallback that throws on any `prepare()`/`run()` call (e.g.
  startup failed and `createFallbackDb()` was used), when I call `GET /random/character`, then I
  receive HTTP 500 with `{ "error": { "type": "internal", "message": "Internal server error" } }`
  and the process does not crash.
- Given the same unavailable-database condition, when I call `GET /random/character/history`,
  then I receive the same HTTP 500 `internal` error envelope and the process does not crash.

### Done When
- [ ] `GET /random/character` against a throwing DB stub returns HTTP 500 with
      `error.type === "internal"` and the test process remains alive
- [ ] `GET /random/character/history` against a throwing DB stub returns HTTP 500 with
      `error.type === "internal"` and the test process remains alive
