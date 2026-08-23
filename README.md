# AgentCrash

AgentCrash is a deterministic AI-agent reliability engine and demo application for PS4. It runs an e-commerce support agent through 15 weighted normal, edge, system-failure, and adversarial scenarios inside an isolated sandbox.

The repository is split into a standalone frontend and backend. The backend owns SQLite persistence, API validation, sandbox execution, event evidence, findings, scoring, run history, and re-tests. The frontend only renders API data and sends commands.

## Run locally

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:8080`. The API runs at `http://127.0.0.1:8787`; its OpenAPI document is available at `/api/v1/openapi.json`.

## Verify

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

## Key files

- `PROJECT_SPEC.md` — complete product and engineering specification
- `frontend/` — TanStack Start interface, API client, presentation adapters, routes, and components
- `backend/` — Fastify API, SQLite repositories, evaluation services, deterministic engine, and tests
- `backend/data/agentcrash.sqlite` — local durable data created automatically at runtime

## Safety boundary

The MVP never calls real payment, email, order, or customer systems. All state changes are isolated fixture mutations using integer minor currency units.

Built with TanStack Start, React, Fastify, Node SQLite, TypeScript, Tailwind CSS, Motion, Zod, and Vitest.
