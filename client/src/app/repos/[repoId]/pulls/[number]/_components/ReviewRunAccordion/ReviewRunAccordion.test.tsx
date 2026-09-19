/**
 * ReviewRunAccordion — the collapsed header is the at-a-glance summary of one
 * agent's pass, so it carries what that pass cost right next to when it ran.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ReviewRecord } from "@devdigest/shared";

vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useDeleteReview: () => ({ mutate: () => {}, isPending: false }),
}));

import { ReviewRunAccordion } from "./ReviewRunAccordion";

afterEach(cleanup);

function review(o: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    id: "rv-1",
    pr_id: "pr-1",
    agent_id: "a1",
    run_id: "run-1",
    agent_name: "General Reviewer",
    kind: "review",
    verdict: "request_changes",
    summary: "Two critical exposures.",
    score: 38,
    model: "deepseek/deepseek-v4-flash",
    grounding: "3/3 passed",
    cost_usd: 0.0013,
    created_at: "2026-06-13T18:52:51.000Z",
    findings: [],
    ...o,
  };
}

describe("ReviewRunAccordion header cost", () => {
  it("shows what the run cost", () => {
    render(<ReviewRunAccordion review={review({ cost_usd: 0.0013 })} prId="pr-1" />);
    expect(screen.getByText("$0.0013")).toBeInTheDocument();
  });

  it("shows an em-dash when the run has no known price", () => {
    render(<ReviewRunAccordion review={review({ cost_usd: null })} prId="pr-1" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
