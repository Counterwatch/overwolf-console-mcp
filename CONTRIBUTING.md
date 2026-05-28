# Contributing

Thanks for helping improve **overwolf-console-mcp**! Contributions from humans and
AI agents are both welcome.

## Quick start

```bash
npm install
npm run build && npm test && npm run smoke
```

All three must pass before you open a PR. CI runs the same commands.

## Ground rules

- Read **[AGENTS.md](AGENTS.md)** first — it defines the project structure, code
  style, and hard boundaries (most importantly: keep the core free of MCP imports,
  and never write to stdout except MCP protocol output).
- **Never commit secrets.** Use `.env` (gitignored) for real credentials.
- Keep PRs focused. One logical change per PR is easier to review.
- Add or update tests in `tests/` when you change core behavior.

## Adding an endpoint

Endpoints are data, not code — see the **"How to add an endpoint"** section in the
[README](README.md#how-to-add-an-endpoint). It's a single row in
[`src/endpoints.ts`](src/endpoints.ts).

## Working with AI assistants

- Mention **`@claude`** in an issue or PR to ask Claude to investigate, propose a
  fix, or open a PR (maintainer authenticates it with a Claude Pro/Max subscription
  via the `CLAUDE_CODE_OAUTH_TOKEN` secret — see `.github/workflows/claude.yml`).
- **CodeRabbit** will review your PR automatically and leave inline suggestions.

## Reporting bugs / requesting features

Open an issue using the provided templates. For bugs, include the tool you called,
the arguments, what you expected, and what happened (redact any credentials).

## Releasing (maintainers)

Publishing to npm is automated by [`.github/workflows/release.yml`](.github/workflows/release.yml),
which runs on every published GitHub Release.

### One-time setup

The **first** publish of a new package name can't use OIDC (the package must exist
before a trusted publisher can be attached), so it's done once by hand:

```bash
npm publish --access public   # 2FA prompt; no --provenance locally (CI-only)
```

Then enable token-free releases: on npmjs.com → the package → **Settings → Trusted
Publishing** → add **GitHub Actions**, repository `Counterwatch/overwolf-console-mcp`,
workflow `release.yml`. After that you can delete any `NPM_TOKEN` secret and the
`NODE_AUTH_TOKEN` line in the workflow — OIDC handles auth.

### Each release

```bash
# 1. Changes merged to main, CI green.
npm version patch          # or minor / major — bumps package.json, commits, tags vX.Y.Z
git push --follow-tags     # push the version commit and the tag
gh release create vX.Y.Z --generate-notes   # publishing the Release triggers the workflow
```

The workflow then runs `npm ci → build → test → smoke` and, only if all pass,
`npm publish --provenance --access public` (authenticated via Trusted Publishing).
You never run `npm publish` by hand again.

**Guardrails**

- `npm version` requires a clean working tree — commit your work first. It also keeps
  the git tag and `package.json` version in lockstep, preventing "forgot to bump →
  duplicate-version" publish failures.
- The workflow publishes whatever version is in `package.json` at the tagged commit.
- Provenance is attached automatically (the "published via GitHub Actions" attestation
  on npm).

## Security

Do **not** open a public issue for security problems. See [SECURITY.md](SECURITY.md).
