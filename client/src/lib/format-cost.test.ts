import { describe, it, expect } from "vitest";
import { formatCost } from "./format-cost";

describe("formatCost", () => {
  it("shows an em-dash when there is no price", () => {
    expect(formatCost(null)).toBe("—");
    expect(formatCost(undefined)).toBe("—");
    expect(formatCost(NaN)).toBe("—");
  });

  it("distinguishes a free run from an unpriced one", () => {
    // A model priced at 0 (the free eval baseline) really did cost nothing;
    // that is a different statement from "we don't know what this cost".
    expect(formatCost(0)).toBe("$0");
    expect(formatCost(null)).toBe("—");
  });

  it("keeps 4 decimals below a cent, so a cheap run is not flattened to $0.00", () => {
    expect(formatCost(0.0013)).toBe("$0.0013");
    expect(formatCost(0.0099)).toBe("$0.0099");
  });

  it("switches to 3 decimals at a cent", () => {
    expect(formatCost(0.01)).toBe("$0.010");
    expect(formatCost(0.014)).toBe("$0.014");
    expect(formatCost(0.999)).toBe("$0.999");
  });

  it("switches to 2 decimals at a dollar", () => {
    expect(formatCost(1)).toBe("$1.00");
    expect(formatCost(1.27)).toBe("$1.27");
    expect(formatCost(1234.5)).toBe("$1234.50");
  });
});
