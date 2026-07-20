"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, UserRound } from "lucide-react";

const links = [
  { href: "/account", label: "Profile", icon: UserRound },
  { href: "/orders", label: "My Orders", icon: Package },
];

export function AccountNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="flex gap-2 overflow-x-auto pb-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href === "/orders" && pathname.startsWith("/orders/"));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`client-button-secondary shrink-0 ${active ? "border-[var(--client-text-primary)] bg-[var(--client-text-primary)] text-white" : ""}`}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
