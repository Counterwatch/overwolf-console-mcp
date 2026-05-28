# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, use GitHub's **private vulnerability reporting**: go to the repository's
**Security → Report a vulnerability** tab. If that is unavailable, email the
maintainer listed in [`package.json`](package.json).

Include a description, reproduction steps, and the impact. We aim to acknowledge
reports within a few days.

## Handling credentials

This server reads your Overwolf credentials (`OVERWOLF_EMAIL`, `OVERWOLF_API_KEY`)
from the environment or a local `.env` file:

- Credentials are sent only to the configured `OVERWOLF_BASE_URL`
  (`https://console.overwolf.com/api/stats` by default) in the `authorization`
  header. They are **never logged** (logging goes to stderr and excludes the auth
  header) and never written to stdout.
- Keep your `.env` out of version control (it is gitignored).
- If a key is exposed, **revoke it** in the Overwolf Console
  (Settings → Profile → "Revoke and get new API key"), which invalidates the old key.

## Supported versions

This project is pre-1.0; security fixes are applied to the latest released version.
