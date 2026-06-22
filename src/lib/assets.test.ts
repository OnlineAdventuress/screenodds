import { statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { articles } from "./articles";

describe("editorial media assets", () => {
  it("ships non-empty generated hero images for every published guide", () => {
    for (const article of articles) {
      const imagePath = path.join(process.cwd(), "public", article.heroImage);
      const image = statSync(imagePath);

      expect(image.size).toBeGreaterThan(10_000);
    }
  });

  it("keeps the global OpenGraph image lightweight enough for crawlers", () => {
    const imagePath = path.join(process.cwd(), "public", "images", "screenodds-og.png");
    const image = statSync(imagePath);

    expect(image.size).toBeLessThanOrEqual(500_000);
  });
});
