import Link from "next/link";

const navItems = [
  ["Movies", "/movies"],
  ["Box Office", "/box-office"],
  ["Awards", "/awards"],
  ["TV", "/tv"],
  ["Reality TV", "/reality-tv"],
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/92">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded border border-amber-300/40 bg-amber-300/10 font-mono text-sm font-bold text-amber-200">
            SO
          </span>
          <span>
            <span className="block text-base font-semibold text-zinc-50">ScreenOdds</span>
            <span className="block text-xs text-zinc-500">Entertainment market desk</span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-2">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href} className="screen-nav-link">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
