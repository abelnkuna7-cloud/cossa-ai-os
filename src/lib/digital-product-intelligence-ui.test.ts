import { describe, expect, it } from "vitest";
import { buildDigitalProductAssistant, mergeDraftPreflightIssues } from "./digital-product-intelligence-ui";
describe("Product Manager digital assistant", () => {
  it("distinguishes an entered unsaved price from a missing price", () => {
    const result = buildDigitalProductAssistant({ name: "Children's eBook", description: "A storybook for ages 3-7", sellingPrice: 199, persistedSellingPrice: null });
    expect(result.sellingPriceState).toBe("entered_unsaved");
    expect(result.notices).toContain("Selling price is entered in the current form but is not yet persisted.");
  });
  it("reports a truly missing price", () => { expect(buildDigitalProductAssistant({ name: "AI prompt pack", sellingPrice: 0, persistedSellingPrice: 0 }).sellingPriceState).toBe("missing"); });
  it("rewrites stale database price blocker when the draft has a price", () => { expect(mergeDraftPreflightIssues(["Missing selling price", "Missing product image"], { sellingPrice: 199, persistedSellingPrice: 0 })).toEqual(["Selling price entered — save draft to persist it", "Missing product image"]); });
});
