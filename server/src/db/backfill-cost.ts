import 'dotenv/config';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { createDb, type Db } from './client.js';
import * as t from './schema.js';
import { estimateCost } from '../adapters/llm/pricing.js';

/**
 * Backfill `agent_runs.cost_usd` for runs that predate the column.
 *
 * Those rows still carry `model`, `tokens_in` and `tokens_out`, so the cost can
 * be reconstructed — but only as an ESTIMATE at TODAY's list prices, not the
 * amount the provider actually billed at the time. Runs written from now on
 * store the real figure (OpenRouter reports it per generation), so this script
 * is a one-shot for history, not something to re-run for accuracy.
 *
 * A run on a model absent from the price table keeps NULL and renders as an
 * em-dash, which is the honest answer.
 *
 * Only runs with status='done' are touched. A failed or cancelled run has its
 * token counts zero-filled, so pricing it would assert "$0" — a claim we cannot
 * make, since it may well have burned tokens before it died. The run executor
 * writes NULL for those, and this pass matches it.
 *
 * The same pass patches `run_traces.trace->'stats'->'cost_usd'`, otherwise the
 * run drawer would show "—" for a run the PR list already prices.
 *
 * Idempotent: only touches rows where cost_usd IS NULL.
 * See `specs/01-run-cost.md`.
 */
export async function backfillCost(db: Db): Promise<{
  scanned: number;
  priced: number;
  unpriced: number;
  tracesPatched: number;
  unknownModels: string[];
}> {
  const rows = await db
    .select({
      id: t.agentRuns.id,
      model: t.agentRuns.model,
      tokensIn: t.agentRuns.tokensIn,
      tokensOut: t.agentRuns.tokensOut,
    })
    .from(t.agentRuns)
    .where(
      and(
        isNull(t.agentRuns.costUsd),
        isNotNull(t.agentRuns.tokensIn),
        eq(t.agentRuns.status, 'done'),
      ),
    );

  const unknownModels = new Set<string>();
  let priced = 0;
  let unpriced = 0;
  let tracesPatched = 0;

  for (const run of rows) {
    if (!run.model) {
      unpriced++;
      continue;
    }
    const cost = estimateCost(run.model, run.tokensIn ?? 0, run.tokensOut ?? 0);
    if (cost == null) {
      unknownModels.add(run.model);
      unpriced++;
      continue;
    }

    await db.update(t.agentRuns).set({ costUsd: cost }).where(eq(t.agentRuns.id, run.id));
    priced++;

    // jsonb_set only writes when `stats` is already an object; a trace row that
    // never had stats is left alone rather than given a half-built one.
    const patched = await db
      .update(t.runTraces)
      .set({
        trace: sql`jsonb_set(${t.runTraces.trace}, '{stats,cost_usd}', to_jsonb(${cost}::double precision), true)`,
      })
      .where(
        and(
          eq(t.runTraces.runId, run.id),
          sql`jsonb_typeof(${t.runTraces.trace} -> 'stats') = 'object'`,
        ),
      )
      .returning({ runId: t.runTraces.runId });
    tracesPatched += patched.length;
  }

  return {
    scanned: rows.length,
    priced,
    unpriced,
    tracesPatched,
    unknownModels: [...unknownModels].sort(),
  };
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const handle = createDb(url);
  backfillCost(handle.db)
    .then(async (r) => {
      console.log('✓ cost backfilled', r);
      if (r.unknownModels.length > 0) {
        console.log(
          `  ${r.unknownModels.length} model(s) absent from the price table, left NULL:`,
          r.unknownModels.join(', '),
        );
      }
      await handle.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('✗ cost backfill failed:', err);
      await handle.close();
      process.exit(1);
    });
}
