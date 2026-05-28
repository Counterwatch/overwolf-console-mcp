// Live smoke test against the REAL Overwolf API. Reads your credentials from the
// environment or a local .env file (nothing is hardcoded or committed). It calls
// get_daily_active_users for the last 30 days to confirm auth, the response envelope,
// and rate limiting all work end-to-end ("Last 7 Days" is rejected by the DAU endpoint).
//
// Usage:
//   1) Set OVERWOLF_EMAIL + OVERWOLF_API_KEY (and ideally OVERWOLF_DEFAULT_APP_ID)
//      via your shell or a .env file in the project root.
//   2) npm run build
//   3) npm run live-check               # uses OVERWOLF_DEFAULT_APP_ID
//      npm run live-check -- <app_id>   # or pass an app id explicitly
import { writeSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(__dirname, "../dist/index.js");

function fail(message) {
  writeSync(2, `LIVE-CHECK FAIL: ${message}\n`); // synchronous so the reason isn't lost on a piped stderr
  process.exit(1);
}

if (!process.env.OVERWOLF_EMAIL || !process.env.OVERWOLF_API_KEY) {
  // The server itself also enforces this, but fail early with a friendly hint.
  process.stderr.write(
    "Note: OVERWOLF_EMAIL / OVERWOLF_API_KEY not found in this shell.\n" +
      "Set them in your environment or a .env file in the project root before running.\n",
  );
}

const appId = process.argv[2]; // optional; otherwise OVERWOLF_DEFAULT_APP_ID is used

// Pass the current environment through so credentials from the shell OR a .env file
// (loaded by the server via dotenv) both work.
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  env: { ...process.env },
  stderr: "inherit",
});

const client = new Client({ name: "live-check", version: "0.0.0" });

try {
  await client.connect(transport);

  const args = { days_back: "Last 30 Days" };
  if (appId) args.app_id = appId;

  const result = await client.callTool({ name: "get_daily_active_users", arguments: args });
  const text = result.content?.[0]?.text ?? "";

  if (result.isError) {
    fail(`tool returned an error:\n${text}`);
  }

  const parsed = JSON.parse(text);
  process.stderr.write(
    `LIVE-CHECK PASS: get_daily_active_users returned ${parsed.row_count} row(s), ` +
      `${parsed.columns?.length ?? 0} column(s).\n`,
  );
  if (parsed.rows?.length) {
    process.stderr.write(`First row: ${JSON.stringify(parsed.rows[0])}\n`);
  }
} catch (err) {
  fail(err?.stack ?? String(err));
} finally {
  await client.close().catch(() => {});
}

process.exit(0);
