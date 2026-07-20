import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && <p className="client-eyebrow">{eyebrow}</p>}
        <h2 className="client-section-title mt-2">{title}</h2>
        {description && (
          <p className="mt-3 text-base leading-7 text-[var(--client-text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
