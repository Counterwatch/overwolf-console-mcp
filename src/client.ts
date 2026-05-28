import type { Config } from "./config.js";

/** A column descriptor from the uniform Overwolf stats envelope. */
export interface StatsColumn {
  name: string;
  friendly_name?: string;
  type?: string;
}

/** The uniform response envelope returned by every stats endpoint. */
export interface StatsResponse {
  rows: Array<Record<string, unknown>>;
  columns: StatsColumn[];
}

/** Error thrown for non-2xx API responses; carries the HTTP status. */
export class OverwolfApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly resetSeconds?: number,
  ) {
    super(message);
    this.name = "OverwolfApiError";
  }
}

/** stdio rule: diagnostics go to stderr only — never stdout. */
function log(message: string): void {
  process.stderr.write(`[overwolf-console-mcp] ${message}\n`);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Sliding-window limiter that proactively spaces requests so we stay under the
 * server's quota instead of relying on 429s. Default: 5 requests / 60s.
 */
export class RateLimiter {
  private hits: number[] = [];
  private readonly max: number;

  constructor(
    max: number,
    private readonly windowMs: number,
  ) {
    this.max = Math.max(1, max); // guard against a 0/negative limit causing a spin
  }

  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.hits = this.hits.filter((t) => now - t < this.windowMs);
      if (this.hits.length < this.max) {
        this.hits.push(now);
        return;
      }
      const oldest = this.hits[0] ?? now;
      const waitMs = this.windowMs - (now - oldest) + 50;
      log(`local throttle: ${this.max}/${this.windowMs / 1000}s reached, waiting ${Math.ceil(waitMs / 1000)}s`);
      await sleep(waitMs);
    }
  }
}

export interface ClientOptions {
  /** Max requests per window (default 5). */
  maxRequests?: number;
  /** Window length in ms (default 60_000). */
  windowMs?: number;
  /** Max seconds to wait when honoring a 429 reset (default 60). */
  maxRetryWaitSeconds?: number;
}

/**
 * Thin HTTP client for the Overwolf Developer Console stats API. Knows nothing
 * about MCP — it only resolves the base URL, auth header, rate limiting, and the
 * response envelope, so it can be reused by any transport (stdio today, a remote
 * OAuth server later).
 */
export class OverwolfClient {
  private readonly limiter: RateLimiter;
  private readonly maxRetryWaitSeconds: number;

  constructor(
    private readonly config: Config,
    options: ClientOptions = {},
  ) {
    this.limiter = new RateLimiter(options.maxRequests ?? 5, options.windowMs ?? 60_000);
    this.maxRetryWaitSeconds = options.maxRetryWaitSeconds ?? 60;
  }

  /** Calls an endpoint by slug (path after the base URL) and returns the envelope. */
  async request(slug: string, params: Record<string, string>): Promise<StatsResponse> {
    const url = this.buildUrl(slug, params);

    await this.limiter.acquire();
    let res = await fetch(url, { headers: this.headers() });

    if (res.status === 429) {
      const reset = this.parseResetSeconds(res);
      const wait = Math.min(reset, this.maxRetryWaitSeconds);
      log(`429 for ${slug}; waiting ${wait}s then retrying once (reset=${reset}s)`);
      await sleep(wait * 1000);
      await this.limiter.acquire();
      res = await fetch(url, { headers: this.headers() });
      if (res.status === 429) {
        const reset2 = this.parseResetSeconds(res);
        throw new OverwolfApiError(
          `Rate limit exceeded. Retry in ${reset2}s.`,
          429,
          reset2,
        );
      }
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const detail = body ? `: ${body.slice(0, 300)}` : "";
      throw new OverwolfApiError(
        `Overwolf API error ${res.status} ${res.statusText} for "${slug}"${detail}`,
        res.status,
      );
    }

    let data: Partial<StatsResponse>;
    try {
      data = (await res.json()) as Partial<StatsResponse>;
    } catch {
      throw new OverwolfApiError(`Overwolf API returned a non-JSON ${res.status} response for "${slug}".`, res.status);
    }
    return {
      rows: Array.isArray(data.rows) ? data.rows : [],
      columns: Array.isArray(data.columns) ? data.columns : [],
    };
  }

  private headers(): Record<string, string> {
    // Secret — never logged.
    return {
      authorization: `Key ${this.config.email}:${this.config.apiKey}`,
      accept: "application/json",
    };
  }

  private buildUrl(slug: string, params: Record<string, string>): string {
    if (slug.includes("?") || slug.includes("#")) {
      throw new Error(
        `Invalid endpoint path "${slug}": it must not contain "?" or "#". Put query parameters in the "params" argument.`,
      );
    }
    const base = `${this.config.baseUrl}/${slug.replace(/^\/+/, "")}`;
    // Build the query manually with encodeURIComponent so spaces become %20, not "+".
    // URLSearchParams uses "+", which the stats API does not decode back to a space —
    // so multi-word filter values like "All Versions" get rejected (HTTP 400).
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");
    return query ? `${base}?${query}` : base;
  }

  /**
   * Interprets `X-RateLimit-Reset`, which may be seconds-until-reset (the common
   * case), a Unix epoch in seconds, or a Unix epoch in milliseconds. Falls back to
   * the full window when missing/unparseable, and clamps the result to [1, 3600] so
   * a skewed clock or garbage header can't produce an absurd wait or error message.
   */
  private parseResetSeconds(res: Response): number {
    const raw = res.headers.get("x-ratelimit-reset");
    const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (!Number.isFinite(n) || n <= 0) return 60;
    const nowSec = Math.floor(Date.now() / 1000);
    let seconds: number;
    if (n > 1e12) {
      seconds = Math.round(n / 1000) - nowSec; // epoch milliseconds
    } else if (n > nowSec) {
      seconds = n - nowSec; // epoch seconds
    } else {
      seconds = n; // seconds-until-reset
    }
    return Math.min(Math.max(seconds, 1), 3600);
  }
}
