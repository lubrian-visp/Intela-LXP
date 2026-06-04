# Playwright smoke suite (R10)

Per-role smoke coverage for Intela SkillChain. Each role visits its 5 most
important pages and the test fails on any 5xx, unexpected console error, or
404 redirect.

## Run

```bash
bun add -D @playwright/test
bunx playwright install --with-deps chromium
bunx playwright test
```

Open the HTML report:

```bash
bunx playwright show-report
```

## Configuration

| Env var | Purpose |
|---|---|
| `PLAYWRIGHT_BASE_URL` | Override target (defaults to the preview URL). |
| `SMOKE_<ROLE>_EMAIL` / `SMOKE_<ROLE>_PASSWORD` | Per-role credentials. Roles with missing credentials are **skipped**, not failed. |

Roles: `SUPER_ADMIN`, `SYSTEMS_ADMIN`, `PM`, `OPS`, `ASSESSOR`, `MOD`,
`FACILITATOR`, `MENTOR`, `LEARNER`, `SPONSOR`, `TALENT`.

## CI

GitHub Actions:

```yaml
- uses: actions/setup-node@v4
  with: { node-version: 20 }
- run: bun install
- run: bunx playwright install --with-deps chromium
- run: bunx playwright test
  env:
    SMOKE_LEARNER_EMAIL: ${{ secrets.SMOKE_LEARNER_EMAIL }}
    SMOKE_LEARNER_PASSWORD: ${{ secrets.SMOKE_LEARNER_PASSWORD }}
    # ...rest
- uses: actions/upload-artifact@v4
  if: always()
  with: { name: playwright-report, path: playwright-report }
```
