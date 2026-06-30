**Status:** Accepted

## Story: Get a Random Number

**Requirement:** FR-1

As an HTTP client, I want to call `GET /random` so that I receive a random integer without
managing my own generation logic.

### Acceptance Criteria

#### Happy Path
- Given the server is running, when a client sends `GET /random`, then the response status is 200 and the body is `{ "data": { "number": N } }` where N is an integer in the inclusive range [1, 100]
- Given the server is running, when `GET /random` is called 10 times, then all 10 responses contain an integer in [1, 100]

#### Negative Paths
- Given the server is running, when a client sends `POST /random`, then the response status is 404 and the body matches the error envelope `{ "error": { "type": "not_found", "message": "Not found" } }`

### Done When
- [ ] `GET /random` returns HTTP 200
- [ ] Response body is `{ "data": { "number": N } }` with N an integer
- [ ] N is always in the inclusive range [1, 100] across multiple calls
- [ ] `POST /random` returns HTTP 404 with the error envelope

---

## Story: Unknown Route Returns 404

**Requirement:** FR-2

As an HTTP client, I want unrecognised routes to return a structured 404 so that I receive a
consistent error envelope rather than an unformatted HTML error page.

### Acceptance Criteria

#### Happy Path
- Given the server is running, when a client sends `GET /nonexistent`, then the response status is 404 and the body is `{ "error": { "type": "not_found", "message": "Not found" } }`
- Given the server is running, when a client sends `GET /random/extra/segments`, then the response status is 404 and the body matches the error envelope

#### Negative Paths
- Given the server is running, when a client sends `DELETE /anything`, then the response status is 404 and the body is the JSON error envelope (not an HTML page or empty body)

### Done When
- [ ] Any unmatched route returns HTTP 404
- [ ] Response `Content-Type` is `application/json`
- [ ] Response body matches `{ "error": { "type": "not_found", "message": "Not found" } }` exactly

---

## Story: Configurable Server Port

**Requirement:** FR-3

As an operator, I want the server port to be configurable via the `PORT` environment variable
so that I can run the service on any port without changing code.

### Acceptance Criteria

#### Happy Path
- Given no `PORT` env var is set, when the server starts, then it listens on port 3000 and logs "Listening on port 3000"
- Given `PORT=4000` is set, when the server starts, then it listens on port 4000 and logs "Listening on port 4000"

#### Negative Paths
- Given `PORT` is set to a non-numeric value (e.g. `PORT=abc`), when the server starts, then Node's `server.listen()` fails immediately with an error and the process exits non-zero rather than silently binding to an unexpected port

### Done When
- [ ] Server starts on port 3000 when `PORT` is unset
- [ ] Server starts on the value of `PORT` when it is set to a valid port number
- [ ] Startup log message includes the actual listening port
