# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Copilot, Cursor, Gemini CLI, etc.)
working in this repo. Humans: this doubles as a quick "how this project works" guide.

## Commands

> Runs on **Node 18.19+** (published package and dev scripts both — `node --import`
> needs 18.19). On Windows, use Node 21+ or run via Git Bash/WSL so the `npm test`
> file glob (`tests/*.test.ts`) expands.

```bash
npm install        # install dependencies (also builds dist/ via the prepare script)
npm run build      # compile TypeScript (src/ -> dist/) — must pass before a PR
npm run typecheck  # type-check without emitting
npm test           # run unit tests (node:test + tsx) over the pure core
npm run smoke      # auto-builds, then spawns the server over stdio and asserts it works
npm run dev        # run the server from source with watch (tsx)
npm start          # run the built server (node dist/index.js)
```

Before opening a PR, run all of these and make sure they pass:

```bash
npm run build && npm test && npm run smoke
```

## Project structure

The hard rule of this project: **the API core is fully decoupled from the MCP
transport layer.** The core must never import the MCP SDK, so it can later be lifted
into a remote (OAuth-hosted) server unchanged.

| File | Responsibility | May import MCP/zod? |
|------|----------------|---------------------|
| `src/config.ts` | Env/`.env` config loading + validation | No |
| `src/client.ts` | HTTP client: auth, rate limiting, 429 retry, response envelope | No |
| `src/endpoints.ts` | Data-driven endpoint registry + `resolveParams` | No |
| `src/format.ts` | Compact result shaping + `max_rows` cap | No |
| `src/server.ts` | Builds the `McpServer`, registers tools from the registry | **Yes** |
| `src/index.ts` | Entry point — wires only the stdio transport | Yes (transport) |
| `tests/` | Unit tests for the pure core | No |
| `scripts/smoke.mjs` | End-to-end stdio smoke test | Yes (client) |

## Code style

- TypeScript, ESM (`"type": "module"`), `NodeNext` module resolution. Local imports
  use explicit `.js` extensions (e.g. `import { loadConfig } from "./config.js"`).
- `strict` mode is on, including `noUncheckedIndexedAccess` and
  `verbatimModuleSyntax` — use `import type` for type-only imports.
- Keep the core free of MCP imports (see the table above).
- Comments explain *why*, not *what*. Don't add narration comments.

## Adding or changing an endpoint

Endpoints are **data, not code**. To add one, append a row to the `RAW` array in
`src/endpoints.ts` with the exact slug and params (with their documented defaults)
taken from the official Overwolf Postman collections:

- Performance: https://dev.overwolf.com/assets/openapi/Developers-Console-API.postman_collection.json
- Revenue: https://dev.overwolf.com/assets/openapi/Developers-Console-Revenue-Statistics-API.postman_collection.json

Read each item's **request URL** for the slug (the path after `/api/stats/`) and its
`url.query` keys. A typed tool is generated automatically. Update the registry
integrity test in `tests/core.test.ts` if you change headline tools.

## Boundaries — do NOT

- **Never commit secrets.** Real keys live only in `.env` (gitignored) or the
  environment. `.env.example` carries placeholders only.
- **Never write to stdout except MCP protocol output.** All logging/diagnostics go
  to **stderr** (`process.stderr.write` / `console.error`). A stray `console.log`
  will corrupt the stdio stream and break clients. This is why `dotenv` is loaded
  with `{ quiet: true }`.
- **Never add MCP/zod imports to the core files** listed as "No" above.
- Don't bypass the rate limiter or remove the 429 handling — the API allows only
  **5 requests / 60s**.

## Git workflow

- Branch from `main`, open a PR. CI (`npm run build && npm test && npm run smoke`)
  must pass. Keep commits focused; no AI attribution in commit messages.
