import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Netlify security headers", () => {
  it("declares baseline crawler-safe security headers for every route", () => {
    const source = readFileSync(path.join(process.cwd(), "netlify.toml"), "utf8");

    expect(source).toContain('for = "/*"');
    expect(source).toContain("Content-Security-Policy");
    expect(source).toContain("X-Frame-Options");
    expect(source).toContain("Referrer-Policy");
    expect(source).toContain("Permissions-Policy");
  });
});
