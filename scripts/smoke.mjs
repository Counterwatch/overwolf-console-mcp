// End-to-end smoke test: spawn the built stdio server with stub credentials,
// connect a real MCP client, and confirm tools are registered and list_endpoints
// responds. Exits non-zero on any failure. Run with: npm run smoke
import { writeSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(__dirname, "../dist/index.js");

function fail(message) {
  writeSync(2, `SMOKE FAIL: ${message}\n`); // synchronous so the reason isn't lost on a piped stderr
  process.exit(1);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  // Stub credentials so the server starts; list_endpoints needs no real network call.
  env: {
    ...process.env,
    OVERWOLF_EMAIL: "smoke@example.com",
    OVERWOLF_API_KEY: "smoke-key",
  },
  stderr: "inherit",
});

const client = new Client({ name: "smoke-test", version: "0.0.0" });

try {
  await client.connect(transport);
  process.stderr.write("SMOKE: connected to server over stdio\n");

  const { tools } = await client.listTools();
  const toolNames = new Set(tools.map((t) => t.name));
  process.stderr.write(`SMOKE: ${tools.length} tools registered\n`);

  for (const required of ["list_endpoints", "query_console_stats", "get_daily_active_users"]) {
    if (!toolNames.has(required)) fail(`expected tool "${required}" to be registered`);
  }

  const result = await client.callTool({ name: "list_endpoints", arguments: {} });
  if (result.isError) fail(`list_endpoints returned an error: ${JSON.stringify(result.content)}`);

  const text = result.content?.[0]?.text;
  if (!text) fail("list_endpoints returned no text content");

  const parsed = JSON.parse(text);
  if (!Number.isInteger(parsed.count) || parsed.count < 1) fail(`unexpected endpoint count: ${parsed.count}`);
  if (!Array.isArray(parsed.endpoints) || parsed.endpoints.length !== parsed.count) {
    fail("endpoints array does not match count");
  }

  process.stderr.write(`SMOKE PASS: server started, ${tools.length} tools, ${parsed.count} endpoints listed\n`);
} catch (err) {
  fail(err?.stack ?? String(err));
} finally {
  await client.close().catch(() => {});
}

process.exit(0);
