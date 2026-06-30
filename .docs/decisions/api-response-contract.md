# ADR: API Response Contract

**Date:** 2026-06-30
**Status:** Accepted
**Scope:** All API endpoints in this project

## Context

API projects need a consistent response contract defined before implementation. Without one,
each controller invents its own envelope and error format — leading to inconsistency that
compounds across endpoints.

## Decision

### Success Envelope

```json
{
  "data": { ... }
}
```

### Error Envelope

```json
{
  "error": {
    "type": "not_found | internal",
    "message": "Human-readable description"
  }
}
```

### HTTP Status Conventions

| Status | When |
|--------|------|
| 200 | Successful GET |
| 404 | Route not found |
| 500 | Unexpected server error |

### Conventions

- No authentication required
- No pagination (single-value responses only)
- No request body required on any endpoint

## Deviations

Any endpoint deviating from this contract requires an amendment to this ADR with rationale.
