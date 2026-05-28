import assert from "node:assert/strict";
import { test } from "node:test";

import { loadConfig } from "../src/config.js";
import type { Config } from "../src/config.js";
import { ENDPOINTS, resolveGenericParams, resolveParams } from "../src/endpoints.js";
import { DEFAULT_MAX_ROWS, formatStatsResponse } from "../src/format.js";
import { OverwolfClient } from "../src/client.js";
import type { StatsResponse } from "../src/client.js";

const baseConfig: Config = {
  email: "a@b.com",
  apiKey: "key",
  baseUrl: "https://console.overwolf.com/api/stats",
};

test("loadConfig throws listing every missing required var", () => {
  assert.throws(() => loadConfig({}), /OVERWOLF_EMAIL.*OVERWOLF_API_KEY/);
});

test("loadConfig strips trailing slash and applies defaults", () => {
  const cfg = loadConfig({
    OVERWOLF_EMAIL: "a@b.com",
    OVERWOLF_API_KEY: "key",
    OVERWOLF_BASE_URL: "https://example.com/api/stats/",
  });
  assert.equal(cfg.baseUrl, "https://example.com/api/stats");
  assert.equal(cfg.defaultAppId, undefined);
});

test("loadConfig falls back to the production base URL", () => {
  const cfg = loadConfig({ OVERWOLF_EMAIL: "a@b.com", OVERWOLF_API_KEY: "key" });
  assert.equal(cfg.baseUrl, "https://console.overwolf.com/api/stats");
});

test("registry: tool names are unique and every endpoint requires app_id", () => {
  const names = ENDPOINTS.map((e) => e.toolName);
  assert.equal(new Set(names).size, names.length, "duplicate tool names");
  for (const ep of ENDPOINTS) {
    assert.ok(ep.slug.length > 0, `empty slug for ${ep.toolName}`);
    assert.ok(
      ep.params.some((p) => p.name === "app_id" && p.required),
      `${ep.toolName} is missing a required app_id param`,
    );
  }
});

test("registry: headline tools are present with friendly names", () => {
  const byName = new Map(ENDPOINTS.map((e) => [e.toolName, e]));
  assert.equal(byName.get("get_daily_active_users")?.slug, "performance/daily-active-users-dau");
  assert.equal(byName.get("get_monthly_active_users")?.slug, "performance/monthly-active-users-mau");
  assert.equal(byName.get("get_app_installs")?.slug, "performance/app-installs");
});

test("resolveParams throws when app_id is absent and no default is set", () => {
  const ep = ENDPOINTS.find((e) => e.toolName === "get_daily_active_users")!;
  assert.throws(() => resolveParams(ep, {}, baseConfig), /Missing app_id/);
});

test("resolveParams falls back to OVERWOLF_DEFAULT_APP_ID and fills documented defaults", () => {
  const ep = ENDPOINTS.find((e) => e.toolName === "get_daily_active_users")!;
  const params = resolveParams(ep, {}, { ...baseConfig, defaultAppId: "app-123" });
  assert.equal(params.app_id, "app-123");
  assert.equal(params.country_name, "All Countries");
  assert.equal(params.days_back, "Last 180 Days");
  assert.equal(params.app_version, "All Versions");
});

test("resolveParams lets explicit args override defaults and the env app_id", () => {
  const ep = ENDPOINTS.find((e) => e.toolName === "get_daily_active_users")!;
  const params = resolveParams(
    ep,
    { app_id: "explicit", days_back: "Last 90 Days" },
    { ...baseConfig, defaultAppId: "app-123" },
  );
  assert.equal(params.app_id, "explicit");
  assert.equal(params.days_back, "Last 90 Days");
});

test("resolveGenericParams falls back to default app_id for empty/whitespace and drops empties", () => {
  const cfg = { ...baseConfig, defaultAppId: "app-123" };
  assert.equal(resolveGenericParams({ app_id: "" }, cfg).app_id, "app-123");
  assert.equal(resolveGenericParams({ app_id: "   " }, cfg).app_id, "app-123");
  assert.equal(resolveGenericParams({}, cfg).app_id, "app-123");
  assert.equal(resolveGenericParams({ app_id: "explicit" }, cfg).app_id, "explicit");
  // empty non-app_id values are dropped, not sent as ""
  assert.equal("country_name" in resolveGenericParams({ country_name: "" }, cfg), false);
  // with no default and no app_id, nothing is injected (passthrough)
  assert.equal("app_id" in resolveGenericParams({}, baseConfig), false);
});

test("OverwolfClient.request rejects a path containing ? or # before any request", async () => {
  const client = new OverwolfClient(baseConfig);
  await assert.rejects(() => client.request("performance/x?app_id=y", {}), /must not contain/);
  await assert.rejects(() => client.request("performance/x#frag", {}), /must not contain/);
});

test("formatStatsResponse caps rows and reports truncation", () => {
  const resp: StatsResponse = {
    rows: Array.from({ length: 150 }, (_, i) => ({ i })),
    columns: [{ name: "i", friendly_name: "Index", type: "number" }],
  };
  const out = formatStatsResponse(resp, 100);
  assert.equal(out.row_count, 150);
  assert.equal(out.returned, 100);
  assert.equal(out.truncated, true);
  assert.equal(out.rows.length, 100);
  assert.equal(out.columns.length, 1);
});

test("formatStatsResponse does not truncate when under the cap and defaults to 100", () => {
  const resp: StatsResponse = { rows: [{ a: 1 }, { a: 2 }], columns: [] };
  const out = formatStatsResponse(resp);
  assert.equal(out.returned, 2);
  assert.equal(out.truncated, false);
  assert.equal(DEFAULT_MAX_ROWS, 100);
});
