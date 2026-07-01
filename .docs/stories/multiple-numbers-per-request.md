**Status:** Accepted

## Story: Default single-number request is unaffected by the new parameter

**Requirement:** FR-1

As an API consumer who has never used `count`, I want `GET /random` to keep working exactly as
before, so that my existing integration doesn't break.

### Acceptance Criteria

#### Happy Path
- Given no query parameters, when I call `GET /random`, then I receive HTTP 200 with
  `{ "data": { "number": N } }` where N is an integer in [1, 100]

#### Negative Paths
- Given an unrelated/unknown query parameter (e.g. `?foo=bar`) with no `count`, when I call
  `GET /random`, then the response is still the legacy scalar shape `{ "data": { "number": N } }`
  with HTTP 200 (unknown params are ignored, not treated as invalid `count`)

### Done When
- [ ] `GET /random` with no `count` returns `{ "data": { "number": N } }`, HTTP 200
- [ ] Response shape for this path has no `numbers` array key present

---

## Story: Requesting a batch of numbers returns an array

**Requirement:** FR-2

As an API consumer who needs several random numbers at once, I want to pass `count=N`, so that I
get N numbers back in a single response instead of making N requests.

### Acceptance Criteria

#### Happy Path
- Given `count=5`, when I call `GET /random?count=5`, then I receive HTTP 200 with
  `{ "data": { "numbers": [n1, n2, n3, n4, n5] } }` where each `n` is an integer in [1, 100]
- Given `count=1`, when I call `GET /random?count=1`, then I receive
  `{ "data": { "numbers": [n1] } }` (array shape, not the legacy scalar shape)
- Given `count=100`, when I call `GET /random?count=100`, then I receive 100 integers in [1, 100]

#### Negative Paths
- Given `count=0`, when I call `GET /random?count=0`, then I receive HTTP 400 with
  `{ "error": { "type": "validation", "message": "count must be a positive integer" } }`

### Done When
- [ ] `GET /random?count=5` returns a 5-element `numbers` array of integers in [1, 100], HTTP 200
- [ ] `GET /random?count=1` returns `{ "data": { "numbers": [n1] } }`, not `{ "data": { "number": n1 } }`
- [ ] `GET /random?count=100` returns exactly 100 integers, HTTP 200

---

## Story: No-consecutive-repeat holds within a batch and across requests

**Requirement:** FR-3, FR-4

As an API consumer relying on the no-consecutive-repeat guarantee, I want that guarantee to hold
for every adjacent pair of numbers a batch produces — and to carry into whatever I request next —
so that batching doesn't weaken an existing contract.

### Acceptance Criteria

#### Happy Path
- Given a fresh server state, when I call `GET /random?count=50`, then no two adjacent numbers in
  the returned array are equal
- Given a prior single `GET /random` call returned `X`, when I immediately call
  `GET /random?count=10`, then the first number in the returned array is never `X`
- Given a `GET /random?count=10` call whose last returned number is `Y`, when I immediately call
  `GET /random` (no count), then the returned number is never `Y`

#### Negative Paths
- Given `count=100` (the maximum allowed), when the batch is generated, then the sequential
  regenerate-until-different logic still terminates and returns exactly 100 numbers with no
  adjacent duplicates (no infinite loop or timeout under the largest allowed batch)

### Done When
- [ ] A 50-number batch has zero adjacent duplicate pairs, verified across repeated runs
- [ ] The server-global `lastNumber` after a batch equals the batch's last element
- [ ] A batch immediately following any prior request never starts with that prior request's last number

---

## Story: Every number in a batch is persisted individually

**Requirement:** FR-5

As an operator auditing generated numbers, I want every number from a batch request to appear in
history as its own entry, so that batch and single-number generations are equally auditable.

### Acceptance Criteria

#### Happy Path
- Given an empty history, when I call `GET /random?count=5`, then `GET /random/history` returns
  5 new entries, each with its own `number` and `generatedAt`, most recent first
- Given a batch of 3 followed by a single `GET /random` call, when I call `GET /random/history`,
  then it contains 4 entries in the correct generation order (most recent first)

#### Negative Paths
- Given a batch request that fails validation (e.g. `count=0`), when I subsequently call
  `GET /random/history`, then no new entries were added as a result of the failed request

### Done When
- [ ] `GET /random/history` row count increases by exactly `count` after a successful batch request
- [ ] Each persisted row's `number` matches one of the values returned in the batch response, in order

---

## Story: Non-integer, zero, or negative count is rejected

**Requirement:** FR-6

As an API consumer, I want a clear error when I pass an invalid `count`, so that I know my request
was malformed rather than silently getting a default.

### Acceptance Criteria

#### Happy Path
- Given `count=25`, when I call `GET /random?count=25`, then I receive a valid 25-number batch,
  HTTP 200

#### Negative Paths
- Given `count=abc`, when I call `GET /random?count=abc`, then I receive HTTP 400 with
  `{ "error": { "type": "validation", "message": "count must be a positive integer" } }`
- Given `count=2.5`, when I call `GET /random?count=2.5`, then I receive HTTP 400 with the same
  validation error
- Given `count=-3`, when I call `GET /random?count=-3`, then I receive HTTP 400 with the same
  validation error
- Given `count=` (empty string), when I call `GET /random?count=`, then I receive HTTP 400 with
  the same validation error

### Done When
- [ ] `count=abc`, `count=2.5`, `count=-3`, `count=0`, and `count=` all return HTTP 400 with
      `type: "validation"` and no numbers generated or persisted

---

## Story: Count exceeding the cap is rejected

**Requirement:** FR-7, FR-8

As an API consumer, I want to be told clearly when I ask for too many numbers, so that a typo
(e.g. an extra zero) doesn't silently generate and store an enormous batch.

### Acceptance Criteria

#### Happy Path
- Given `count=100` (the maximum), when I call `GET /random?count=100`, then I receive 100
  numbers, HTTP 200

#### Negative Paths
- Given `count=101`, when I call `GET /random?count=101`, then I receive HTTP 400 with
  `{ "error": { "type": "validation", "message": "count must not exceed 100" } }` and no numbers
  are generated or persisted
- Given `count=1000000`, when I call `GET /random?count=1000000`, then I receive the same HTTP 400
  cap error rather than the server attempting to generate a million numbers

### Done When
- [ ] `count=101` and `count=1000000` both return HTTP 400 with `type: "validation"` and the
      "must not exceed 100" message
- [ ] `GET /random/history` count is unchanged after a rejected over-cap request
