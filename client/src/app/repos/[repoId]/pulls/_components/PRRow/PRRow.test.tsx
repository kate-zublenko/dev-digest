/**
 * PRRow — the PR list is a hand-rolled CSS grid, so the column count lives in
 * three places that must agree: GRID's track list, COLUMN_KEYS, and the cells
 * rendered here. These tests guard that invariant and the COST cell itself.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrMeta } from "@devdigest/shared";
import messages from "../../../../../../../messages/en/prReview.json";
import { GRID, COLUMN_KEYS } from "../../constants";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

import { PRRow } from "./PRRow";

afterEach(cleanup);

function pr(o: Partial<PrMeta> = {}): PrMeta {
  return {
    id: "pr-1",
    number: 482,
    title: "Add rate limiting to public API endpoints",
    author: "marisa.koch",
    branch: "feat/rate-limit",
    base: "main",
    head_sha: "abc1234",
    additions: 200,
    deletions: 85,
    files_count: 6,
    status: "needs_review",
    opened_at: "2026-06-10T10:00:00.000Z",
    updated_at: "2026-06-13T10:00:00.000Z",
    score: 61,
    cost_usd: 0.014,
    ...o,
  };
}

function renderRow(meta: PrMeta) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <PRRow pr={meta} repoId="repo-1" />
    </NextIntlClientProvider>,
  );
}

describe("PRRow cost column", () => {
  it("renders the PR's total spend", () => {
    renderRow(pr({ cost_usd: 0.014 }));
    expect(screen.getByText("$0.014")).toBeInTheDocument();
  });

  it("renders an em-dash for a PR nothing has been spent on", () => {
    renderRow(pr({ cost_usd: null, score: null }));
    // The score cell also renders an em-dash when unreviewed, so expect both.
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("keeps one grid cell per column key", () => {
    const { container } = renderRow(pr());
    const row = container.firstElementChild!;
    expect(row.children).toHaveLength(COLUMN_KEYS.length);
    expect(GRID.split(/\s+/)).toHaveLength(COLUMN_KEYS.length);
  });
});
