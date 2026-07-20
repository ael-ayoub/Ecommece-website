"use client";

import { cn } from "@/lib/cn";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function AdminSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: Props) {
  return (
    <div className={cn("admin-switch-field", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className="admin-switch"
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true" />
      </button>
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </div>
  );
}
