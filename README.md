# overwolf-console-mcp

[![npm version](https://img.shields.io/npm/v/overwolf-console-mcp.svg)](https://www.npmjs.com/package/overwolf-console-mcp)
[![CI](https://github.com/Counterwatch/overwolf-console-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Counterwatch/overwolf-console-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A local **stdio [MCP](https://modelcontextprotocol.io) server** that wraps the
**Overwolf Developer Console statistics API**, so an MCP client (Claude Desktop,
Cursor, etc.) can fetch your app's analytics on demand — DAU/MAU, installs,
retention, crashes, and the full ads-revenue suite.

It is open source and `npx`-runnable: point it at your own Overwolf app and ask your
assistant things like *"what was my DAU over the last 7 days?"* or *"compare net ad
revenue this month vs. last."*

- **Typed tools** for every documented performance + revenue endpoint (33 of them).
- **A generic passthrough** (`query_console_stats`) for any endpoint by path.
- **A discovery tool** (`list_endpoints`) so the assistant can see what's available.
- **Decoupled core**: the API client has no MCP dependency, so it can be lifted into
  a remote (OAuth-hosted) server later without a rewrite.

## Requirements

- Node.js **>= 18** (uses the built-in `fetch`).
- An Overwolf Developer Console account and API key (below).

## Getting an Overwolf API key

The key is shown **only once**, so copy it immediately.

1. Sign in to the [Overwolf Developer Console](https://console.overwolf.com).
2. Go to **Settings → Profile**.
3. Click **"Revoke and get new API key"**.
4. **Copy the key right away** — it is displayed a single time. (Revoking
   invalidates any previous key.)

Your API requests authenticate with the header
`authorization: Key {your-email}:{your-api-key}`. This server builds that header for
you from the `OVERWOLF_EMAIL` and `OVERWOLF_API_KEY` environment variables.

## Configuration

Set these via environment variables or a local `.env` file (copy
[`.env.example`](.env.example); `.env.local` is also supported and takes precedence):

| Variable | Required | Description |
|----------|----------|-------------|
| `OVERWOLF_EMAIL` | ✅ | Account email used in the auth header. |
| `OVERWOLF_API_KEY` | ✅ | Console API key (see above). |
| `OVERWOLF_DEFAULT_APP_ID` | – | App ID used when a tool call omits `app_id`. |
| `OVERWOLF_BASE_URL` | – | Override the API base URL. Defaults to `https://console.overwolf.com/api/stats`. |

**Never commit a real key.** `.env` is gitignored; `.env.example` ships placeholders only.

> `.env`/`.env.local` are loaded from the **current working directory**, which is convenient for local development (run from the project root). When an MCP client launches the server (e.g. via `npx`), the working directory is the client's, not this project's — so for that use pass credentials through the client config's `env` block (shown below) rather than relying on a `.env` file.

## Use with Claude Desktop

Add the server to your `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`,
Windows: `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "overwolf-console": {
      "command": "npx",
      "args": ["-y", "overwolf-console-mcp"],
      "env": {
        "OVERWOLF_EMAIL": "you@example.com",
        "OVERWOLF_API_KEY": "your-api-key",
        "OVERWOLF_DEFAULT_APP_ID": "your-app-id"
      }
    }
  }
}
```

Restart Claude Desktop (fully quit it — not just the window — so it reloads the
config). The server's tools (e.g. `get_daily_active_users`) then appear. The same
`command`/`args`/`env` block works in any MCP client that supports stdio servers.

> **Windows:** if Claude Desktop can't launch `npx` directly (a common Windows quirk
> — it spawns the command without a shell), use the `cmd` wrapper instead:
> `"command": "cmd"`, `"args": ["/c", "npx", "-y", "overwolf-console-mcp"]`.

## Usage

Once it's connected, just ask your assistant in plain English — it picks the right
tool and fills in your `app_id` from `OVERWOLF_DEFAULT_APP_ID`. For example:

- "What was my DAU over the last 30 days?"
- "How has MAU trended over the past year?"
- "Show app installs by country for the last 90 days."
- "Break down this month's net ad revenue."
- "What's my day-1 and day-7 user retention?"
- "Any crash spikes on the latest app version?"

For discovery, ask *"list the available Overwolf stats endpoints"* (calls
`list_endpoints`). Responses come back as compact JSON capped at `max_rows`
(default 100). Mind the **5 requests / 60s** rate limit — the server throttles and
retries automatically, so avoid firing many queries at once.

## Run locally (development)

```bash
git clone https://github.com/Counterwatch/overwolf-console-mcp.git
cd overwolf-console-mcp
npm install
cp .env.example .env   # then edit .env with your credentials
npm run build
npm start              # serves on stdio
```

For iterating on source: `npm run dev` (watch mode). To verify a build end-to-end:
`npm run smoke`.

## Tools

Each endpoint is exposed as a typed tool. Call `list_endpoints` for the live list
with parameters, or browse below.

**Discovery & generic**

- `list_endpoints` — list every registered endpoint and its params.
- `query_console_stats` — call any endpoint by path: `{ path, params?, max_rows? }`.
  The escape hatch for anything not (yet) typed.

**Headline performance tools**

- `get_daily_active_users` — `performance/daily-active-users-dau`
- `get_monthly_active_users` — `performance/monthly-active-users-mau`
- `get_app_installs` — `performance/app-installs`

<details>
<summary><strong>All 33 typed tools</strong></summary>

_Performance:_ `get_daily_active_users`, `get_monthly_active_users`,
`get_app_installs`, `get_app_uninstalls`, `get_dau_per_country`,
`get_user_retention_daily`, `get_user_retention_weekly`,
`get_user_retention_monthly`, `get_window_open_count_per_day`,
`get_median_window_open_duration_per_day`,
`get_app_window_open_duration_distribution`, `get_app_crashes`,
`get_partner_report_app_game_dau`, `get_app_version_by_dau`

_Revenue:_ `get_daily_ads_revenue_gross_net`, `get_month_to_date_revenue_net`,
`get_video_ads_general_metrics`, `get_video_ads_revenue_net`,
`get_display_ads_general_metrics`, `get_display_ads_revenue_net`,
`get_video_ads_completion_rate`, `get_video_ads_detailed_metrics`,
`get_display_ads_estimated_metrics`, `get_all_ads_metrics_monthly`,
`get_video_ads_metrics_monthly`, `get_display_ads_metrics_monthly`,
`get_average_ads_container_open_time`, `get_video_ads_rpm_per_window`,
`get_daily_avg_revenue_per_dau_per_country`, `get_daily_avg_revenue_per_dau_us`,
`get_daily_avg_revenue_per_dau_non_us`, `get_ads_revenue_net_yearly_comparison`,
`get_monthly_ads_metrics`

</details>

### Common parameters

`app_id` (falls back to `OVERWOLF_DEFAULT_APP_ID`), and where applicable:
`country_name` (capitalized, e.g. `"United States"`, or `"All Countries"`),
`days_back` (allowed: `"Last 30 Days"`, `"Last 90 Days"`, `"Last 180 Days"`, `"Last 365 Days"`),
`app_version` (or `"All Versions"`), `installation_source` (or `"All Sources"`),
`window_name` (or `"All Windows"`), `attribution` (or `"All Attributions"`),
`ad_size` (or `"All Sizes"`). Every tool also accepts `max_rows` (default **100**).

### Response shape

All tools return compact JSON, capped at `max_rows`:

```json
{ "row_count": 180, "returned": 100, "truncated": true, "columns": [ ... ], "rows": [ ... ] }
```

`columns` carries each field's `name`, `friendly_name`, and `type` from the API's
uniform envelope.

## Rate limits

The Overwolf stats API allows **5 requests per 60 seconds**. This server throttles
client-side to stay under that limit, and on an HTTP `429` it retries once honoring
the `X-RateLimit-Reset` header before returning a clear error telling you how many
seconds to wait. Spread out bulk queries accordingly.

## How to add an endpoint

Endpoints are **data, not code** — adding one is a single row in the registry.

1. Open the official Postman collection for the endpoint:
   - Performance: <https://dev.overwolf.com/assets/openapi/Developers-Console-API.postman_collection.json>
   - Revenue: <https://dev.overwolf.com/assets/openapi/Developers-Console-Revenue-Statistics-API.postman_collection.json>
2. Find the request and read its **URL** — the slug is everything after
   `/api/stats/` (e.g. `revenue/monthly-ads-metrics`) — and its **query params**
   (`url.query`) with their default values.
3. Append a row to the `RAW` array in [`src/endpoints.ts`](src/endpoints.ts):

   ```ts
   {
     slug: "performance/my-new-endpoint",
     title: "My New Endpoint",
     params: [param("app_id"), param("days_back", "Last 30 Days")],
   },
   ```

   A typed tool named `get_my_new_endpoint` is generated automatically. (Pass
   `tool: "get_custom_name"` to override the derived name.)
4. `npm run build && npm test && npm run smoke`.

Not sure a slug/param is correct? Skip the typed entry — `query_console_stats`
already covers any endpoint by path.

## Contributing & AI-assisted development

This repo is built to be friendly to both humans and AI coding agents:

- **[AGENTS.md](AGENTS.md)** — the contract agents (and humans) should read first:
  commands, structure, code style, and hard boundaries.
- **CodeRabbit** reviews every pull request automatically (free for public repos).
- **`@claude`** — mention it in an issue or PR and Claude can triage, propose fixes,
  or open PRs. The maintainer authenticates it with a **Claude Pro/Max subscription**
  (run `claude setup-token`, add the result as the `CLAUDE_CODE_OAUTH_TOKEN` secret) —
  no metered API billing required. See [`.github/workflows/claude.yml`](.github/workflows/claude.yml).
- **CI** runs build, tests, and the stdio smoke test on every push and PR.

See [CONTRIBUTING.md](CONTRIBUTING.md) and report security issues per
[SECURITY.md](SECURITY.md).

## Disclaimer

Community project. Not affiliated with or endorsed by Overwolf. Endpoint slugs and
parameters are derived from Overwolf's published Postman collections and may change.

## License

[MIT](LICENSE) © 2026 Counterwatch
