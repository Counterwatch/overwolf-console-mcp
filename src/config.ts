import dotenv from "dotenv";

// Load local env files if present. `.env.local` (personal secrets, gitignored) takes
// precedence over `.env`; real environment variables beat both. `quiet: true` is
// REQUIRED: dotenv v17 otherwise prints a banner to stdout, which would corrupt the
// MCP stdio protocol stream.
dotenv.config({ path: [".env.local", ".env"], quiet: true });

const DEFAULT_BASE_URL = "https://console.overwolf.com/api/stats";

/** Resolved runtime configuration for the Overwolf stats client. */
export interface Config {
  /** Account email used in the `authorization` header. */
  email: string;
  /** Console API key used in the `authorization` header. */
  apiKey: string;
  /** API base URL, without a trailing slash. */
  baseUrl: string;
  /** Optional app ID used when a tool call omits `app_id`. */
  defaultAppId?: string;
}

/**
 * Reads configuration from the environment. Throws a clear error listing every
 * missing required variable so a misconfigured client fails fast and visibly.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const email = env.OVERWOLF_EMAIL?.trim();
  const apiKey = env.OVERWOLF_API_KEY?.trim();

  const missing: string[] = [];
  if (!email) missing.push("OVERWOLF_EMAIL");
  if (!apiKey) missing.push("OVERWOLF_API_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Set them in your environment or a .env file (see .env.example).`,
    );
  }

  const baseUrl = (env.OVERWOLF_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const defaultAppId = env.OVERWOLF_DEFAULT_APP_ID?.trim() || undefined;

  return { email: email!, apiKey: apiKey!, baseUrl, defaultAppId };
}
