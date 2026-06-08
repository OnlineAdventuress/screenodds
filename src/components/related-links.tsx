import Link from "next/link";

type RelatedLinksProps = {
  title?: string;
  links: Array<{ href: string; label: string; description: string }>;
};

export function RelatedLinks({ title = "Related ScreenOdds pages", links }: RelatedLinksProps) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <h2 className="text-2xl font-semibold text-zinc-50">{title}</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="screen-panel block p-4">
            <p className="font-semibold text-zinc-100">{link.label}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{link.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
