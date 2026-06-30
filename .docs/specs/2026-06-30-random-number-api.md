# PRD: Random Number API

**Date:** 2026-06-30
**Status:** Approved

## Problem / Background

Need a simple HTTP API that returns a random integer on demand. This is an MVP/demo project
to establish a working Node/Express service with standard structure.

## Goals & Non-Goals

**Goals**
- Expose a single endpoint that returns a random integer in a fixed range
- Follow a minimal but extensible Express project structure

**Non-Goals**
- User-configurable ranges
- Authentication or rate limiting
- Persistence or logging beyond startup messages
- Batch generation

## Users / Personas

- Any HTTP client (browser, curl, another service) that needs a random integer without
  managing its own generation logic

## Functional Requirements

- **FR-1:** `GET /random` returns a 200 response with a JSON body conforming to the success
  envelope: `{ "data": { "number": <integer 1–100> } }`, where the number is randomly
  selected from the inclusive range [1, 100] on each call.
- **FR-2:** Any request to an undefined route returns a 404 response with a JSON body
  conforming to the error envelope: `{ "error": { "type": "not_found", "message": "Not found" } }`.
- **FR-3:** The server starts on the port defined by the `PORT` environment variable, falling
  back to 3000, and logs the listening port on startup.

## Non-Functional Requirements

- No external runtime dependencies beyond `express`
- Cold start under 1 second on a standard development machine

## Acceptance Criteria / Success Metrics

- `GET /random` called 10 times returns 10 integers all within [1, 100]
- `GET /nonexistent` returns HTTP 404 with the error envelope
- `PORT=4000 node index.js` starts the server on port 4000

## Scope

### In Scope
- `GET /random` endpoint
- 404 catch-all handler
- Configurable port via `PORT` env var

### Out of Scope
- Any authentication
- Range parameters
- Health check endpoint
- Any database or persistence

## Key Decisions & Rationale

- **Minimal MVC structure (Approach B):** `src/app.js` + `src/routes/random.js` + `index.js`.
  Adds zero complexity while making the project extensible without a full refactor.
- **Fixed range [1, 100]:** User confirmed no range configuration needed for MVP.
- **`express` only:** No framework beyond Express; no ORM, no validation library.

## Dependencies

- Node.js runtime
- `express` npm package

## Open Questions

- None
