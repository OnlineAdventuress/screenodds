import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const hubPages = [
  ["movies/page.tsx", 'canonical: "/movies"'],
  ["awards/page.tsx", 'canonical: "/awards"'],
  ["tv/page.tsx", 'canonical: "/tv"'],
  ["reality-tv/page.tsx", 'canonical: "/reality-tv"'],
] as const;

describe("hub page metadata source", () => {
  it("sets explicit canonical URLs for every entertainment hub", () => {
    for (const [file, canonical] of hubPages) {
      const source = readFileSync(path.join(process.cwd(), "src/app", file), "utf8");

      expect(source).toContain("alternates:");
      expect(source).toContain(canonical);
    }
  });
});
