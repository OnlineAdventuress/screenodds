import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteNetworkLinks } from "./site-network-links";
import { getAllNetworkSites } from "../lib/site-network";

describe("SiteNetworkLinks", () => {
  it("renders owned domains as crawlable editorial links", () => {
    const html = renderToStaticMarkup(
      <SiteNetworkLinks
        title="More odds research"
        links={getAllNetworkSites().map((site) => ({
          domain: site.domain,
          href: site.href,
          label: site.label,
          description: site.description,
        }))}
      />,
    );

    expect(html).toContain('href="https://geoodds.com/"');
    expect(html).toContain("GeoOdds country and geography markets");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("nofollow");
    expect(html).not.toContain("sponsored");
  });

  it("does not render an empty network section", () => {
    expect(renderToStaticMarkup(<SiteNetworkLinks links={[]} />)).toBe("");
  });
});
