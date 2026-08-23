# AgentCrash backend

Standalone Fastify service for agent registration, deterministic sandbox execution, chaos injection, finding detection, weighted scoring, report persistence, and full-suite re-tests.

## Local development

```sh
npm run dev -w backend
```

The default API origin is `http://127.0.0.1:8787`.

## Runtime behavior

- SQLite is created automatically at `backend/data/agentcrash.sqlite`.
- Schema changes are centralized in `src/db/schema.ts` and applied transactionally.
- Every scenario gets an isolated fixture clone.
- Run results, events, findings, and summaries are committed in one database transaction.
- `Idempotency-Key` prevents duplicate run creation when clients retry.
- HTTP manifests can be registered and analyzed, but MVP sandbox execution only accepts the built-in adapter because external agents must never receive direct access to sandbox internals.

## API

See `GET /api/v1/openapi.json`. Major resources are agents, runs, events, findings, and re-tests.

## Verification

```sh
npm run test -w backend
npm run typecheck -w backend
npm run lint -w backend
npm run build -w backend
```
