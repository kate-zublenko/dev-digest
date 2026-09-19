# Run cost

**Status:** agreed
**Packages touched:** server, client

## Problem

The USD cost of a review run is already computed and then thrown away. The engine
asks OpenRouter for it (`reviewer-core/src/llm/openrouter.ts:83` sends
`usage: { include: true }`), aggregates it across map-reduce chunks into
`ReviewOutcome.costUsd` (`reviewer-core/src/review/run.ts:110`), and the server
drops it on the floor in one destructure:

```ts
const { tokensIn, tokensOut, grounding } = outcome;   // costUsd discarded
```

— `server/src/modules/reviews/run-executor.ts:213`.

So a user cannot see what a review cost them: not per run, not per PR. The model
*pricing catalog* survives (`ModelInfo.pricing`, `adapters/llm/pricing.ts`,
`platform/price-book.ts`) and is unaffected by this work.

## Scope — in / out

**In**

- `agent_runs.cost_usd` persisted on every completed run.
- A `COST` stat tile in the run trace drawer, between `TOKENS` and `FINDINGS`.
- Cost on the run timeline row (under the run time) and in the review-run
  accordion header (immediately before the timestamp).
- A `Cost` column on the PR list, between `Status` and `Updated`, showing the sum
  of every run on that PR.
- A backfill of runs that predate the column, estimated from their stored tokens.

**Out**

- The Agent Performance / cost dashboard (design screen N11).
- Per-model or per-agent cost rollups, budgets, alerts.
- Cache-token accounting (`prompt_tokens_details` is not read anywhere today).

## Contract changes        <!-- @devdigest/shared first, always -->

| File | Change |
|------|--------|
| `contracts/trace.ts` | `RunStats.cost_usd` (nullish), `RunSummary.cost_usd` (nullable) |
| `contracts/platform.ts` | `PrMeta.cost_usd` — list endpoint only, like `score` |
| `contracts/review-api.ts` | `ReviewRecord.cost_usd` — from the joined run |

`RunStats.cost_usd` is **nullish, not nullable**: traces written between migration
`0009` and this change sit in `run_traces.trace` as jsonb with no such key at all,
and a required key would fail to parse them.

## Display rule

One formatter, `client/src/lib/format-cost.ts`, everywhere:

| Value | Rendered |
|-------|----------|
| `null` / `undefined` | `—` |
| `0` | `$0` |
| `< $0.01` | `$0.0013` (4 dp) |
| `< $1` | `$0.014` (3 dp) |
| `>= $1` | `$1.27` (2 dp) |

The design mock renders cost at three different precisions on the three screens;
this rule replaces all three.

## Acceptance criteria

1. A completed OpenRouter run stores the provider's real billed USD in
   `agent_runs.cost_usd`; a run on a model absent from the price table stores NULL.
2. The run trace drawer shows a COST tile between TOKENS and FINDINGS.
3. The run timeline row shows `<tokens> tok · $<cost>` under the run time; the
   review-run accordion header shows the cost immediately before the timestamp.
4. The PR list has a Cost column between Status and Updated, showing the sum of
   every run on that PR, and an em-dash when no run on it is priced.
5. Every cost on screen goes through the one formatter above.
6. Runs that predate the column show a backfilled estimate, not an em-dash.

## Known limits

- **Null-poisoning.** `reviewer-core/src/review/run.ts:184` nulls the whole run's
  cost if any single map-reduce chunk comes back unpriced, so a large multi-file
  PR can legitimately show `—`.
- **Only OpenRouter reports real cost.** The OpenAI and Anthropic adapters fall
  back to the static table in `adapters/llm/pricing.ts`, whose own header flags
  those numbers as approximate; an unknown model yields `null`.
- **Cache tokens are invisible**, so cost on a prompt-caching model is overstated.
- **SDK transport retries** (`openrouter.ts:55`, `maxRetries: 2`) are billed by the
  provider but never seen here.
- **Backfilled rows are priced at today's rates**, not the rates in force when the
  run happened. Rows written from now on store the number at run time and stay
  stable.

## Open questions

- `docs/agent-prompts/choosing-a-model.md` quotes 0.09/0.18 per 1M for the default
  model; `server/src/adapters/llm/pricing.ts:10-35` says 0.14/0.28. Which is right?
