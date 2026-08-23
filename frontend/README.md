# AgentCrash frontend

TanStack Start interface for the AgentCrash reliability backend.

The frontend contains no sandbox, chaos, scoring, finding, or persistence logic. It calls the versioned backend API through `src/lib/api-client.ts` and converts API records into view models in `src/lib/presentation.ts`.

## Local development

```sh
npm run dev -w frontend
```

Set `VITE_API_BASE_URL` when the backend is not available at `http://127.0.0.1:8787/api/v1`.

Device storage only keeps the currently selected agent/run IDs for navigation. The backend remains the authoritative data source.
