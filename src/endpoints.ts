import type { Config } from "./config.js";

export type EndpointCategory = "performance" | "revenue";

export interface EndpointParam {
  name: string;
  description: string;
  /** Value sent to the API when the caller omits this param. */
  default?: string;
  /** `app_id` is the only required param, but may be satisfied by OVERWOLF_DEFAULT_APP_ID. */
  required?: boolean;
}

export interface EndpointDef {
  /** MCP tool name, e.g. "get_daily_active_users". */
  toolName: string;
  /** Path after the base URL, e.g. "performance/daily-active-users-dau". */
  slug: string;
  category: EndpointCategory;
  title: string;
  description: string;
  params: EndpointParam[];
}

const PARAM_DESCRIPTIONS: Record<string, string> = {
  app_id: "Overwolf app ID. Falls back to OVERWOLF_DEFAULT_APP_ID if omitted.",
  app_version: 'App version string, or "All Versions".',
  country_name: 'Capitalized country name (e.g. "United States"), or "All Countries".',
  days_back: 'Time window. Allowed values: "Last 30 Days", "Last 90 Days", "Last 180 Days", "Last 365 Days".',
  installation_source: 'Installation source, or "All Sources".',
  attribution: 'Attribution filter, or "All Attributions".',
  window_name: 'App window name (e.g. "desktop"), or "All Windows".',
  ad_size: 'Ad size, or "All Sizes".',
  country:
    'Country as the Revenue dashboard labels it ("Japan", "United Kingdom", ...), the combined "US" or "Non US", or "All Countries". The United States is "US", not "United States".',
  container_id: 'Ad container ID, or "All Containers".',
};

// The revenue-v2 endpoints take shorter windows than the performance ones, and not all
// of them accept "Yesterday".
const REVENUE_DAYS = 'Time window. Allowed values: "Last 30 Days", "Last 90 Days".';
const REVENUE_DAYS_WITH_YESTERDAY =
  'Time window. Allowed values: "Yesterday", "Last 30 Days", "Last 90 Days".';

function param(name: string, def?: string, description?: string): EndpointParam {
  return {
    name,
    description: description ?? PARAM_DESCRIPTIONS[name] ?? `Filter by ${name}.`,
    default: def,
    required: name === "app_id",
  };
}

/** Derives a tool name from a slug: "performance/app-installs" -> "get_app_installs". */
function toolNameFromSlug(slug: string): string {
  const last = slug.split("/").pop() ?? slug;
  return `get_${last.replace(/-/g, "_")}`;
}

/**
 * The endpoint registry. Adding an endpoint is data, not code: append a row here
 * (slug + params with their documented defaults) and a typed tool appears
 * automatically. Slugs and params are taken verbatim from Overwolf's API reference
 * pages (see README "How to add an endpoint").
 *
 * `tool` overrides the derived name for the three headline metrics; everything
 * else uses the derived `get_<slug-tail>` name.
 */
const RAW: Array<{ slug: string; title: string; params: EndpointParam[]; tool?: string }> = [
  // ----- Performance -----
  {
    slug: "performance/daily-active-users-dau",
    title: "Daily Active Users (DAU)",
    tool: "get_daily_active_users",
    params: [param("app_id"), param("app_version", "All Versions"), param("country_name", "All Countries"), param("days_back", "Last 180 Days")],
  },
  {
    slug: "performance/monthly-active-users-mau",
    title: "Monthly Active Users (MAU)",
    tool: "get_monthly_active_users",
    params: [param("app_id"), param("country_name", "All Countries")],
  },
  {
    slug: "performance/app-installs",
    title: "App Installs",
    tool: "get_app_installs",
    params: [param("app_id"), param("country_name", "All Countries"), param("days_back", "Last 180 Days"), param("installation_source", "All Sources")],
  },
  {
    slug: "performance/app-uninstalls",
    title: "App Uninstalls",
    params: [param("app_id"), param("days_back", "Last 180 Days"), param("installation_source", "All Sources")],
  },
  {
    slug: "performance/dau-per-country",
    title: "DAU per Country",
    params: [param("app_id"), param("days_back", "Last 30 Days")],
  },
  {
    slug: "performance/user-retention-daily",
    title: "User Retention (Daily)",
    params: [param("app_id"), param("country_name", "All Countries"), param("attribution", "All Attributions")],
  },
  {
    slug: "performance/user-retention-weekly",
    title: "User Retention (Weekly)",
    params: [param("app_id"), param("country_name", "All Countries"), param("attribution", "All Attributions")],
  },
  {
    slug: "performance/user-retention-monthly",
    title: "User Retention (Monthly)",
    params: [param("app_id"), param("country_name", "All Countries"), param("attribution", "All Attributions")],
  },
  {
    slug: "performance/window-open-count-per-day",
    title: "Window Open Count per Day",
    params: [param("app_id"), param("days_back", "Last 180 Days"), param("window_name", "All Windows")],
  },
  {
    slug: "performance/median-window-open-duration-per-day",
    title: "Median Window Open Duration per Day",
    // Postman example used "desktop"; default to "All Windows" for a sensible, non-filtered default.
    params: [param("app_id"), param("days_back", "Last 180 Days"), param("window_name", "All Windows")],
  },
  {
    slug: "performance/app-window-open-duration-distribution",
    title: "App Window Open Duration Distribution",
    params: [param("app_id"), param("days_back", "Last 180 Days"), param("window_name", "All Windows")],
  },
  {
    slug: "performance/app-crashes",
    title: "App Crashes",
    params: [param("app_id"), param("app_version", "All Versions"), param("days_back", "Last 180 Days")],
  },
  {
    slug: "performance/partner-report-app-game-dau",
    title: "Partner Report: App Game DAU",
    params: [param("app_id")],
  },
  {
    slug: "performance/app-version-by-dau",
    title: "App Version by DAU",
    params: [param("app_id"), param("days_back", "Last 30 Days")],
  },

  // ----- Revenue (revenue-v2) -----
  // The legacy `revenue/` endpoints retire on 2026-12-01. revenue-v2 does not split video
  // from display ads (they share one auction), so the old per-format tools have no successor.
  // Per-DAU and monthly figures carry both bases: a bare `arpdau` / `arpmau` is NET, the
  // `_gross` field beside it is gross.
  {
    slug: "revenue-v2/revenue-yesterday",
    title: "Revenue KPI (yesterday vs the same day last week)",
    params: [param("app_id")],
  },
  {
    slug: "revenue-v2/arpdau-yesterday",
    title: "ARPDAU KPI (yesterday vs the same day last week, US cents)",
    params: [param("app_id")],
  },
  {
    slug: "revenue-v2/rps-yesterday",
    title: "Revenue per Session KPI (yesterday vs the same day last week, US cents)",
    params: [param("app_id")],
  },
  {
    slug: "revenue-v2/cpm-yesterday",
    title: "CPM KPI (yesterday vs the same day last week, USD)",
    params: [param("app_id")],
  },
  {
    slug: "revenue-v2/daily-ads-revenue-gross-net",
    title: "Daily Ads Revenue (Gross and Net, with 7-day rolling averages)",
    params: [param("app_id"), param("days_back", "Last 90 Days", REVENUE_DAYS), param("country", "All Countries")],
  },
  {
    slug: "revenue-v2/month-to-date-revenue",
    title: "Month-to-Date Revenue (Gross and Net)",
    params: [param("app_id"), param("country", "All Countries")],
  },
  {
    slug: "revenue-v2/ads-revenue-year-over-year",
    title: "Ads Revenue Year over Year (last 13 months)",
    params: [param("app_id"), param("country", "All Countries")],
  },
  {
    slug: "revenue-v2/daily-ad-inventory-fill-rate",
    title: "Daily Ad Inventory and Fill Rate",
    // This one endpoint filters on `country_name`, not `country`.
    params: [param("app_id"), param("days_back", "Last 90 Days", REVENUE_DAYS), param("window_name", "All Windows"), param("country_name", "All Countries", PARAM_DESCRIPTIONS.country)],
  },
  {
    slug: "revenue-v2/daily-avg-revenue-per-dau",
    title: "Daily Average Revenue per DAU (Gross and Net, US cents, with benchmark)",
    params: [param("app_id"), param("days_back", "Last 90 Days", REVENUE_DAYS_WITH_YESTERDAY), param("country", "All Countries")],
  },
  {
    slug: "revenue-v2/monetized-users-ratio-by-window",
    title: "Monetized Users Ratio by Window",
    params: [param("app_id"), param("days_back", "Last 90 Days", REVENUE_DAYS), param("app_version", "All Versions")],
  },
  {
    slug: "revenue-v2/average-ads-container-open-time",
    title: "Average Ads Container Open Time",
    params: [param("app_id"), param("days_back", "Last 90 Days", REVENUE_DAYS), param("window_name", "All Windows")],
  },
  {
    slug: "revenue-v2/country-performance",
    title: "Country Performance",
    params: [param("app_id"), param("days_back", "Yesterday", REVENUE_DAYS_WITH_YESTERDAY)],
  },
  {
    slug: "revenue-v2/window-performance",
    title: "Window Performance",
    params: [param("app_id"), param("days_back", "Last 90 Days", REVENUE_DAYS_WITH_YESTERDAY), param("country", "All Countries")],
  },
  {
    slug: "revenue-v2/ad-size-performance",
    title: "Ad Size Performance",
    params: [param("app_id"), param("days_back", "Yesterday", REVENUE_DAYS_WITH_YESTERDAY), param("country", "All Countries")],
  },
  {
    slug: "revenue-v2/daily-ads-metrics",
    title: "Daily Ads Metrics (by ad size, country, window and container)",
    params: [
      param("app_id"),
      // This endpoint takes no "Last 90 Days" (it answers 400), unlike REVENUE_DAYS_WITH_YESTERDAY.
      param("days_back", "Last 30 Days", 'Time window. Allowed values: "Yesterday", "Last 30 Days".'),
      param("ad_size", "All Sizes"),
      param("window_name", "All Windows"),
      param("country", "All Countries"),
      param("container_id", "All Containers"),
    ],
  },
  {
    slug: "revenue-v2/monthly-ads-metrics",
    title: "Monthly Ads Metrics (last 13 months)",
    params: [param("app_id"), param("window_name", "All Windows"), param("country", "All Countries")],
  },
];

export const ENDPOINTS: EndpointDef[] = RAW.map((e) => {
  const category: EndpointCategory = e.slug.startsWith("revenue") ? "revenue" : "performance";
  return {
    toolName: e.tool ?? toolNameFromSlug(e.slug),
    slug: e.slug,
    category,
    title: e.title,
    description: `${e.title} — Overwolf ${category} stat. Endpoint: ${e.slug}.`,
    params: e.params,
  };
});

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === "" ? undefined : s;
}

/**
 * Builds the query params for an endpoint call: resolves `app_id` (arg ->
 * OVERWOLF_DEFAULT_APP_ID, else a clear error) and fills documented defaults for
 * any omitted params. Pure — no MCP or network dependency.
 */
export function resolveParams(
  endpoint: EndpointDef,
  args: Record<string, unknown>,
  config: Config,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of endpoint.params) {
    if (p.name === "app_id") {
      const appId = asString(args.app_id) ?? config.defaultAppId;
      if (!appId) {
        throw new Error("Missing app_id: pass it explicitly or set OVERWOLF_DEFAULT_APP_ID.");
      }
      out.app_id = appId;
      continue;
    }
    const value = asString(args[p.name]) ?? p.default;
    if (value !== undefined) out[p.name] = value;
  }
  return out;
}

/**
 * Builds query params for the generic passthrough tool: normalizes every value
 * (trims; drops empty/whitespace-only ones) and, like the typed tools, falls back
 * to OVERWOLF_DEFAULT_APP_ID when no usable `app_id` was supplied. Pure — no MCP.
 */
export function resolveGenericParams(
  params: Record<string, unknown> | undefined,
  config: Config,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params ?? {})) {
    const str = asString(value);
    if (str !== undefined) out[key] = str;
  }
  if (!("app_id" in out) && config.defaultAppId) {
    out.app_id = config.defaultAppId;
  }
  return out;
}
