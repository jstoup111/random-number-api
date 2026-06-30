**Status:** Accepted

## Story: Server never returns the same number on consecutive calls

**Requirement:** FR-1, FR-2, FR-3, FR-4

As an API consumer, I want `GET /random` to never return the same number twice in a row so that back-to-back calls always yield distinct values.

### Acceptance Criteria

#### Happy Path
- Given the server has previously returned `42`, when `GET /random` is called again, then the response contains a number that is not `42`
- Given 100 consecutive calls to `GET /random`, when responses are inspected pairwise, then no two adjacent responses share the same number
- Given caller A receives `17` and caller B immediately calls `GET /random`, then caller B receives a number that is not `17`

#### Negative Paths
- Given `lastNumber` is `99` and the retry loop generates `99` as a candidate, when the loop retries, then it keeps generating until it produces a value ≠ `99` before returning

### Done When
- [ ] Two consecutive `GET /random` calls return different integers
- [ ] 100 sequential calls produce no adjacent duplicates
- [ ] The route module exposes a `lastNumber` (or equivalent) variable that is updated to the returned value on every successful response

---

## Story: First call after startup is unconstrained

**Requirement:** FR-1, FR-5

As an API consumer, I want the first call after server startup to return any valid number so that the no-repeat constraint doesn't silently bias the initial response.

### Acceptance Criteria

#### Happy Path
- Given the server has just started and `lastNumber` is `null`, when `GET /random` is called for the first time, then any integer in [1, 100] may be returned
- Given the server has just started, when `GET /random` is called, then `lastNumber` is updated to the returned value

#### Negative Paths
- Given `lastNumber` is `null`, when the retry-loop check runs, then the condition `candidate === null` is treated as "no constraint" — the first candidate is always accepted without retry

### Done When
- [ ] `lastNumber` is `null` on module initialisation (before any request is handled)
- [ ] The first request after startup returns an integer in [1, 100] without triggering a retry
- [ ] After the first request, `lastNumber` equals the value that was returned

---

## Story: Out-of-range lastNumber does not cause unnecessary retries

**Requirement:** FR-8

As an API consumer using range parameters, I want the no-repeat constraint to be skipped when the previous value is outside my requested range so that I always receive a response on the first attempt.

### Acceptance Criteria

#### Happy Path
- Given `lastNumber` is `95` and the request is `GET /random?min=1&max=10`, when a candidate in [1, 10] is generated, then the candidate can never equal `95` — it is returned immediately without retry
- Given `lastNumber` is `5` and the request is `GET /random?min=50&max=100`, when a candidate in [50, 100] is generated, then it is returned immediately (no retry possible)

#### Negative Paths
- Given `lastNumber` is `50` and the request is `GET /random?min=1&max=100`, when the candidate happens to equal `50`, then the retry loop fires and a new candidate is selected

### Done When
- [ ] When `lastNumber` is outside the requested `[min, max]` range, the route returns on the first generated candidate (no retry)
- [ ] When `lastNumber` is inside the requested range and the first candidate matches, a second candidate is generated and returned
