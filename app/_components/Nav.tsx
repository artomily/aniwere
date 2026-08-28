"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Position & cover" },
  { href: "/proof", label: "Proof explorer" },
  { href: "/cover", label: "Buy cover" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 mb-6 flex gap-1.5 overflow-x-auto">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-[13px] whitespace-nowrap transition-colors ${
              active
                ? "bg-accent font-semibold text-white shadow-card"
                : "text-ink-3 hover:bg-surface hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
