**Status:** Accepted

## Story: Default Range Preserved

**Requirement:** FR-1

As an HTTP client using `GET /random` without parameters, I want the existing [1, 100] behavior
to remain unchanged so that I do not need to update any existing integrations.

### Acceptance Criteria

#### Happy Path
- Given the server is running and no query parameters are provided, when a client sends `GET /random`, then the response status is 200 and `data.number` is an integer in [1, 100]
- Given the server is running, when `GET /random` is called 10 times with no query parameters, then all 10 responses contain an integer in [1, 100]

#### Negative Paths
- Given the server is running, when a client sends `GET /random?foo=bar` (unknown parameter), then unknown params are ignored and the response still returns an integer in [1, 100] with HTTP 200 — unrecognised query params do not break default behavior

### Done When
- [ ] `GET /random` with no params continues to return HTTP 200 with `{ "data": { "number": N } }` where N ∈ [1, 100]
- [ ] Unrecognised query parameters do not alter the response or cause an error

---

## Story: Custom Full Range

**Requirement:** FR-2, FR-7

As an HTTP client, I want to pass both `min` and `max` query parameters so that I receive a
random integer bounded to my specified range.

### Acceptance Criteria

#### Happy Path
- Given `min=5` and `max=10` are provided, when a client sends `GET /random?min=5&max=10`, then the response status is 200 and `data.number` is an integer in [5, 10] inclusive
- Given a valid range is provided, when the endpoint is called 20 times, then all returned numbers are within the specified range
- Given a valid range is provided, the response envelope is `{ "data": { "number": N } }` — identical structure to the no-param case

#### Negative Paths
- Given `min=10` and `max=5` are provided (inverted range), when a client sends `GET /random?min=10&max=5`, then the response status is 400 and the body is `{ "error": { "type": "validation", "message": "min must be less than max" } }`

### Done When
- [ ] `GET /random?min=5&max=10` returns HTTP 200 with `data.number` in [5, 10] across multiple calls
- [ ] Response envelope matches `{ "data": { "number": N } }` exactly
- [ ] Inverted range (`min > max`) returns HTTP 400 with `validation` error type

---

## Story: Min-Only Parameter

**Requirement:** FR-3

As an HTTP client, I want to pass only `min` so that I can set a lower bound while the upper
bound defaults to 100.

### Acceptance Criteria

#### Happy Path
- Given only `min=5` is provided, when a client sends `GET /random?min=5`, then the response status is 200 and `data.number` is an integer in [5, 100] inclusive
- Given only `min=5`, when the endpoint is called 20 times, then all returned numbers are in [5, 100]

#### Negative Paths
- Given only `min=101` is provided (default max is 100, so resolved range is invalid), when a client sends `GET /random?min=101`, then the response status is 400 and the body contains `{ "error": { "type": "validation", "message": "min must be less than max" } }`

### Done When
- [ ] `GET /random?min=5` returns HTTP 200 with `data.number` in [5, 100] across multiple calls
- [ ] `GET /random?min=101` (exceeds default max) returns HTTP 400 with `validation` error type

---

## Story: Max-Only Parameter

**Requirement:** FR-4

As an HTTP client, I want to pass only `max` so that I can cap the upper bound while the lower
bound defaults to 1.

### Acceptance Criteria

#### Happy Path
- Given only `max=50` is provided, when a client sends `GET /random?max=50`, then the response status is 200 and `data.number` is an integer in [1, 50] inclusive
- Given only `max=50`, when the endpoint is called 20 times, then all returned numbers are in [1, 50]

#### Negative Paths
- Given only `max=0` is provided (default min is 1, so resolved range is min=1 > max=0), when a client sends `GET /random?max=0`, then the response status is 400 and the body contains `{ "error": { "type": "validation", "message": "min must be less than max" } }`

### Done When
- [ ] `GET /random?max=50` returns HTTP 200 with `data.number` in [1, 50] across multiple calls
- [ ] `GET /random?max=0` (below default min) returns HTTP 400 with `validation` error type

---

## Story: Parameter Type Validation

**Requirement:** FR-5

As an HTTP client, I want to receive a clear 400 error when I pass a non-integer value for
`min` or `max` so that I can identify and correct my request.

### Acceptance Criteria

#### Happy Path
- Given `min=1` and `max=10` are valid integers, when a client sends `GET /random?min=1&max=10`, then the response is HTTP 200 with a valid number (confirming type validation passes for correct input)

#### Negative Paths
- Given `min=abc` is a non-integer string, when a client sends `GET /random?min=abc`, then the response status is 400 and body is `{ "error": { "type": "validation", "message": "min and max must be integers" } }`
- Given `min=1.5` is a decimal, when a client sends `GET /random?min=1.5&max=10`, then the response status is 400 and body contains the `validation` error (decimals are not integers)
- Given `max=` is an empty string, when a client sends `GET /random?max=`, then the response status is 400 with the `validation` error

### Done When
- [ ] `GET /random?min=abc` returns HTTP 400 with `{ "error": { "type": "validation", "message": "min and max must be integers" } }`
- [ ] `GET /random?min=1.5&max=10` returns HTTP 400 with `validation` error type
- [ ] `GET /random?max=` returns HTTP 400 with `validation` error type

---

## Story: Range Ordering Validation

**Requirement:** FR-6

As an HTTP client, I want to receive a clear 400 error when `min` is not strictly less than
`max` so that degenerate or inverted ranges surface as mistakes rather than silently returning
a constant.

### Acceptance Criteria

#### Happy Path
- Given `min=1` and `max=2`, when a client sends `GET /random?min=1&max=2`, then the response is HTTP 200 (confirming the boundary: min strictly less than max is accepted)

#### Negative Paths
- Given `min=5` and `max=5` are equal, when a client sends `GET /random?min=5&max=5`, then the response status is 400 and body is `{ "error": { "type": "validation", "message": "min must be less than max" } }`
- Given `min=10` and `max=3`, when a client sends `GET /random?min=10&max=3`, then the response status is 400 with the `validation` error (inverted range caught regardless of whether type validation passes first)

### Done When
- [ ] `GET /random?min=5&max=5` (equal values) returns HTTP 400 with `validation` error type
- [ ] `GET /random?min=10&max=3` (inverted) returns HTTP 400 with `validation` error type
- [ ] `GET /random?min=1&max=2` (minimum valid difference) returns HTTP 200
