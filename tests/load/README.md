# F5.1 — Load Test Runner

Closes finding **F5.1** from the Independent Post-Development Analysis Report:
> "k6 ramp-up 500 → 5,000 VU has been scripted but not executed against a
> production-shaped dataset. P50/P90/P99 vs the < 2 s threshold are therefore
> asserted, not measured."

This directory contains everything needed to **measure** those numbers.

## Files

| File | Purpose |
| --- | --- |
| `seed-prod-shape.ts` | Bun/Node seeder that creates a production-shaped dataset (10 tenants, 200 programmes, 50k learners, 200k enrolments, 100 assessments, 500k grades). |
| `k6-ramp.js` | k6 ramp test (500 → 5,000 VU over ~30 min) exercising the four hottest read paths and asserting P95 < 2 s. |
| `seed-output.json` | Written by the seeder; consumed by k6 to pick random IDs. |
| `results/k6-summary.json` | Written by k6 after the run — attach to the GA sign-off pack. |

## Prerequisites

- **k6** ≥ 0.50 installed locally (`brew install k6` or `nix run nixpkgs#k6`).
- A **staging** Lovable Cloud project (this script refuses to seed any URL
  that does not contain `staging`, `load-test`, `localhost`, or `127.0.0.1`).
- The staging project's `SERVICE_ROLE_KEY` (seeder only — k6 itself runs with
  the anon key + a learner JWT).

## Step 1 — Seed the dataset (one-off, ~10 min)

```bash
export SUPABASE_URL=https://<staging-ref>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<staging service role>
export SEED_CONFIRM=YES

bun run tests/load/seed-prod-shape.ts
```

Output: `tests/load/seed-output.json` containing the ID pools k6 will sample.

## Step 2 — Run the ramp

```bash
export SUPABASE_URL=https://<staging-ref>.supabase.co
export SUPABASE_ANON_KEY=<staging anon>
export BEARER_TOKEN=<optional learner JWT>

k6 run tests/load/k6-ramp.js
```

Stages (total ~35 min):

```
500  VU  →  hold 5m
1500 VU  →  hold 5m
3000 VU  →  hold 5m
5000 VU  →  hold 5m
ramp-down
```

## SLO thresholds (asserted by k6)

| Metric | Threshold |
| --- | --- |
| `dashboard_ms` P95 | < 2000 ms |
| `programme_ms` P95 | < 2000 ms |
| `assessment_ms` P95 | < 2000 ms |
| `gradebook_ms` P95 | < 2500 ms |
| `http_req_duration{type:read}` P99 | < 3500 ms |
| `errors` rate | < 1% |

A non-zero k6 exit code = SLO breach. CI/GA gate should treat that as a **No-Go**.

## What this proves

After a successful run, attach `results/k6-summary.json` and the textual
summary k6 prints to the GA sign-off pack. F5.1 then moves from
**asserted** to **measured** and the verdict is upgraded.

## What this does NOT cover

- Write-path stress (concurrent submissions, grading). Add a separate scenario
  with `executor: 'constant-arrival-rate'` if you need that signal.
- Real WebSocket realtime fan-out. The Supabase Realtime endpoint is not
  hit here — measure separately with `k6/ws`.
- Edge function cold-starts under burst. Use a dedicated scenario invoking
  the function URL if you ship any latency-critical edge function.
