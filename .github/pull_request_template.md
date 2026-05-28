<!-- Thanks for contributing! Please keep PRs focused on one logical change. -->

## What does this PR do?

<!-- A short description of the change and why. -->

## Type of change

- [ ] Bug fix
- [ ] New endpoint(s) added to the registry
- [ ] New feature / tool
- [ ] Docs only
- [ ] Refactor / chore

## Checklist

- [ ] I read [AGENTS.md](AGENTS.md) and kept the core free of MCP imports.
- [ ] No secrets are committed; no `console.log` to stdout (logging goes to stderr).
- [ ] `npm run build && npm test && npm run smoke` all pass locally.
- [ ] For new endpoints: slug and params match the official Overwolf Postman collection.
- [ ] Updated docs/tests as needed.
