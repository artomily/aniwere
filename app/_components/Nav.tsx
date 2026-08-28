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
    <nav className="mt-[18px] mb-5 flex gap-0.5 overflow-x-auto border-b border-line">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-[15px] py-2.5 text-[13.5px] whitespace-nowrap transition-colors ${
              active
                ? "border-proof font-semibold text-ink"
                : "border-transparent text-ink-3 hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
