import type { SiteNetworkLink } from "../lib/site-network";

type SiteNetworkLinksProps = {
  title?: string;
  description?: string;
  links: SiteNetworkLink[];
};

export function SiteNetworkLinks({
  title = "More odds research",
  description,
  links,
}: SiteNetworkLinksProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="screen-kicker">Research network</p>
          <h2 className="mt-3 text-2xl font-semibold text-zinc-50">{title}</h2>
        </div>
        {description ? (
          <p className="max-w-xl text-sm leading-6 text-zinc-400">{description}</p>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {links.map((link) => (
          <a
            key={link.domain}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="screen-panel block p-4"
          >
            <p className="font-semibold text-zinc-100">{link.label}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{link.description}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
