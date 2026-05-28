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
};

function param(name: string, def?: string): EndpointParam {
  return {
    name,
    description: PARAM_DESCRIPTIONS[name] ?? `Filter by ${name}.`,
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
 * automatically. Slugs and params are taken verbatim from the official Overwolf
 * Postman collections (see README "How to add an endpoint").
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

  // ----- Revenue -----
  {
    slug: "revenue/daily-ads-revenue-gross-net",
    title: "Daily Ads Revenue (Gross and Net)",
    params: [param("app_id"), param("days_back", "Last 30 Days")],
  },
  {
    slug: "revenue/month-to-date-revenue-net",
    title: "Month-to-Date Revenue (Net)",
    params: [param("app_id")],
  },
  {
    slug: "revenue/video-ads-general-metrics",
    title: "Video Ads General Metrics",
    params: [param("app_id"), param("days_back", "Last 30 Days"), param("window_name", "All Windows")],
  },
  {
    slug: "revenue/video-ads-revenue-net",
    title: "Video Ads Revenue (Net)",
    params: [param("app_id"), param("days_back", "Last 30 Days"), param("window_name", "All Windows")],
  },
  {
    slug: "revenue/display-ads-general-metrics",
    title: "Display Ads General Metrics",
    params: [param("app_id"), param("days_back", "Last 30 Days")],
  },
  {
    slug: "revenue/display-ads-revenue-net",
    title: "Display Ads Revenue (Net)",
    params: [param("app_id"), param("days_back", "Last 30 Days")],
  },
  {
    slug: "revenue/video-ads-completion-rate",
    title: "Video Ads Completion Rate per Window",
    params: [param("app_id"), param("days_back", "Last 30 Days")],
  },
  {
    slug: "revenue/video-ads-detailed-metrics",
    title: "Video Ads Detailed Metrics",
    params: [param("app_id"), param("days_back", "Last 30 Days"), param("ad_size", "All Sizes"), param("country_name", "All Countries"), param("window_name", "All Windows")],
  },
  {
    slug: "revenue/display-ads-estimated-metrics",
    title: "Display Ads Estimated Metrics",
    params: [param("app_id"), param("days_back", "Last 30 Days"), param("ad_size", "All Sizes"), param("country_name", "All Countries"), param("window_name", "All Windows")],
  },
  {
    slug: "revenue/all-ads-metrics-monthly",
    title: "All Ads Metrics (Monthly)",
    params: [param("app_id")],
  },
  {
    slug: "revenue/video-ads-metrics-monthly",
    title: "Video Ads Metrics (Monthly)",
    params: [param("app_id")],
  },
  {
    slug: "revenue/display-ads-metrics-monthly",
    title: "Display Ads Metrics (Monthly)",
    params: [param("app_id")],
  },
  {
    slug: "revenue/average-ads-container-open-time",
    title: "Average Ads Container Open Time",
    params: [param("app_id"), param("days_back", "Last 30 Days"), param("window_name", "All Windows")],
  },
  {
    slug: "revenue/video-ads-rpm-per-window",
    title: "Video Ads RPM per Window",
    params: [param("app_id"), param("days_back", "Last 30 Days")],
  },
  {
    slug: "revenue/daily-avg-revenue-per-dau-per-country",
    title: "Daily Average Revenue (Gross) per DAU per Country",
    params: [param("app_id"), param("days_back", "Last 30 Days"), param("country_name", "All Countries")],
  },
  {
    slug: "revenue/daily-avg-revenue-per-dau-us",
    title: "Daily Average Revenue (Gross) per DAU - US",
    params: [param("app_id"), param("days_back", "Last 30 Days")],
  },
  {
    slug: "revenue/daily-avg-revenue-per-dau-non-us",
    title: "Daily Average Revenue (Gross) per DAU - Non-US",
    params: [param("app_id"), param("days_back", "Last 30 Days")],
  },
  {
    slug: "revenue/ads-revenue-net-yearly-comparison",
    title: "Ads Revenue (Net) Yearly Comparison",
    params: [param("app_id")],
  },
  {
    slug: "revenue/monthly-ads-metrics",
    title: "Monthly Ad Metrics",
    params: [param("app_id")],
  },
];

export const ENDPOINTS: EndpointDef[] = RAW.map((e) => {
  const category: EndpointCategory = e.slug.startsWith("revenue/") ? "revenue" : "performance";
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
