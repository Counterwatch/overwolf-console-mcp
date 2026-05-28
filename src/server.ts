import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { loadConfig } from "./config.js";
import type { Config } from "./config.js";
import { OverwolfApiError, OverwolfClient } from "./client.js";
import { ENDPOINTS, resolveGenericParams, resolveParams } from "./endpoints.js";
import type { EndpointDef } from "./endpoints.js";
import { DEFAULT_MAX_ROWS, formatStatsResponse } from "./format.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  name: string;
  version: string;
};

const MAX_ROWS_FIELD = "max_rows";

function textResult(text: string, isError = false): CallToolResult {
  return { content: [{ type: "text", text }], isError };
}

function errorResult(err: unknown): CallToolResult {
  if (err instanceof OverwolfApiError) {
    return textResult(`Error (${err.status}): ${err.message}`, true);
  }
  const message = err instanceof Error ? err.message : String(err);
  return textResult(`Error: ${message}`, true);
}

function readMaxRows(args: Record<string, unknown>): number {
  const raw = args[MAX_ROWS_FIELD];
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_MAX_ROWS;
}

function registerEndpointTool(server: McpServer, client: OverwolfClient, config: Config, ep: EndpointDef): void {
  const inputSchema: Record<string, z.ZodTypeAny> = {};
  for (const p of ep.params) {
    inputSchema[p.name] = z.string().optional().describe(p.description);
  }
  inputSchema[MAX_ROWS_FIELD] = z
    .number()
    .int()
    .positive()
    .optional()
    .describe(`Max rows to return (default ${DEFAULT_MAX_ROWS}).`);

  server.registerTool(
    ep.toolName,
    { title: ep.title, description: ep.description, inputSchema },
    async (args) => {
      const a = args as Record<string, unknown>;
      try {
        const params = resolveParams(ep, a, config);
        const resp = await client.request(ep.slug, params);
        return textResult(JSON.stringify(formatStatsResponse(resp, readMaxRows(a))));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}

function registerGenericTool(server: McpServer, client: OverwolfClient, config: Config): void {
  server.registerTool(
    "query_console_stats",
    {
      title: "Query Console Stats (generic)",
      description:
        "Call any Overwolf Developer Console stats endpoint by path. Escape hatch for endpoints not (yet) exposed as a typed tool. Use list_endpoints to discover paths.",
      inputSchema: {
        path: z.string().describe('Endpoint path after /api/stats, e.g. "performance/dau-per-country".'),
        params: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
          .optional()
          .describe('Query params as key/value pairs, e.g. { "app_id": "...", "days_back": "Last 30 Days" }.'),
        max_rows: z.number().int().positive().optional().describe(`Max rows to return (default ${DEFAULT_MAX_ROWS}).`),
      },
    },
    async ({ path, params, max_rows }) => {
      try {
        const query = resolveGenericParams(params, config);
        const resp = await client.request(path, query);
        const cap = typeof max_rows === "number" ? max_rows : DEFAULT_MAX_ROWS;
        return textResult(JSON.stringify(formatStatsResponse(resp, cap)));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}

function registerListTool(server: McpServer): void {
  server.registerTool(
    "list_endpoints",
    {
      title: "List registered endpoints",
      description: "List every registered Overwolf stats endpoint with its tool name and parameters, for discovery.",
      inputSchema: {},
    },
    async () => {
      const endpoints = ENDPOINTS.map((ep) => ({
        tool: ep.toolName,
        slug: ep.slug,
        category: ep.category,
        title: ep.title,
        params: ep.params.map((p) => ({
          name: p.name,
          required: p.required ? "app_id or OVERWOLF_DEFAULT_APP_ID" : false,
          default: p.default ?? null,
        })),
      }));
      return textResult(JSON.stringify({ count: endpoints.length, endpoints }));
    },
  );
}

/**
 * Builds and wires the MCP server: loads config, constructs the API client, and
 * registers a typed tool per endpoint plus the generic passthrough and discovery
 * tools. Transport-agnostic — index.ts attaches the stdio transport.
 */
export function buildServer(): McpServer {
  const config = loadConfig();
  const client = new OverwolfClient(config);
  const server = new McpServer({ name: pkg.name, version: pkg.version });

  for (const ep of ENDPOINTS) {
    registerEndpointTool(server, client, config, ep);
  }
  registerGenericTool(server, client, config);
  registerListTool(server);

  return server;
}
