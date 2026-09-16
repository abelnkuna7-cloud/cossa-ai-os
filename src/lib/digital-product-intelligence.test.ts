import { describe, expect, it } from "vitest";
import { evaluateDigitalProductProfile, inferDigitalSubtype } from "./digital-product-intelligence";
describe("digital product intelligence", () => {
  it("detects a children's storybook from supplied evidence", () => { expect(inferDigitalSubtype({ name: "A Heartwarming African Story About Friendship", description: "A children's eBook for ages 3-7", fileNames: ["storybook.pdf", "activity-book.pdf"] })).toBe("ebook_storybook"); });
  it("does not pretend incomplete ebook metadata is ready", () => { const result = evaluateDigitalProductProfile({ subtype: "ebook_storybook", language: "English", audience: "Children ages 3-7" }); expect(result.complete).toBe(false); expect(result.missing).toContain("creator"); expect(result.missing).toContain("page_count"); });
  it("accepts complete evidence-backed ebook metadata", () => { const result = evaluateDigitalProductProfile({ subtype: "ebook_storybook", language: "English", audience: "Children ages 3-7", creator: "Verified creator", publisher: "Verified publisher", genre: "Children's fiction", page_count: 16 }); expect(result.complete).toBe(true); expect(result.score).toBe(100); });
  it("classifies software separately from courses", () => { expect(inferDigitalSubtype({ name: "Windows business software installer" })).toBe("software"); expect(inferDigitalSubtype({ name: "Business video course masterclass" })).toBe("video_course"); });
});
