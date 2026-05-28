import type { StatsColumn, StatsResponse } from "./client.js";

/** Default cap on rows returned to the client, to keep responses context-friendly. */
export const DEFAULT_MAX_ROWS = 100;

/** Compact, context-friendly shape returned by every tool. */
export interface FormattedResult {
  /** Total rows the API returned. */
  row_count: number;
  /** Rows actually included after applying the cap. */
  returned: number;
  /** True when `row_count` exceeded the cap and rows were dropped. */
  truncated: boolean;
  columns: StatsColumn[];
  rows: Array<Record<string, unknown>>;
}

/** Caps the envelope's rows and annotates how many were dropped. */
export function formatStatsResponse(resp: StatsResponse, maxRows: number = DEFAULT_MAX_ROWS): FormattedResult {
  const cap = Number.isFinite(maxRows) && maxRows > 0 ? Math.floor(maxRows) : DEFAULT_MAX_ROWS;
  const rows = resp.rows.slice(0, cap);
  return {
    row_count: resp.rows.length,
    returned: rows.length,
    truncated: resp.rows.length > cap,
    columns: resp.columns,
    rows,
  };
}
