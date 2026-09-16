import { describe, expect, it } from "vitest";
import { buildDigitalProductAssistant } from "./digital-product-intelligence-ui";

describe("Product Manager digital assistant", () => {
  it("distinguishes an entered unsaved price from a missing price", () => {
    const result = buildDigitalProductAssistant({
      name: "Children's eBook",
      description: "A storybook for ages 3-7",
      sellingPrice: 199,
      persistedSellingPrice: null,
    });
    expect(result.sellingPriceState).toBe("entered_unsaved");
    expect(result.notices).toContain("Selling price is entered in the current form but is not yet persisted.");
  });

  it("reports a truly missing price", () => {
    const result = buildDigitalProductAssistant({ name: "AI prompt pack", sellingPrice: 0, persistedSellingPrice: 0 });
    expect(result.sellingPriceState).toBe("missing");
  });
});
