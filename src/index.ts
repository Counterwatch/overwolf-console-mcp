#!/usr/bin/env node
import { writeSync } from "node:fs";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";

async function main(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio rule: status goes to stderr; stdout carries MCP protocol only.
  process.stderr.write("[overwolf-console-mcp] server connected on stdio\n");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  // writeSync (synchronous) guarantees the message is flushed before exit — a
  // piped stderr (how MCP clients capture it) can drop a buffered async write.
  writeSync(2, `[overwolf-console-mcp] fatal: ${message}\n`);
  process.exit(1);
});
