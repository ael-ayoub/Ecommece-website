import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function StorefrontState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="client-state" aria-labelledby="storefront-state-title">
      <span className="client-state-icon" aria-hidden="true">
        <Icon className="size-6" />
      </span>
      <h2 id="storefront-state-title" className="mt-5 text-xl font-semibold">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--client-text-secondary)]">
        {description}
      </p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="client-button-primary mt-6">
          {actionLabel}
        </Link>
      )}
    </section>
  );
}
