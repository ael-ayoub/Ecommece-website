"use client";

import {
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { MoreHorizontal, X } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-page-heading">
      <div>
        <p className="admin-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="admin-page-actions">{actions}</div> : null}
    </header>
  );
}

export function AdminCard({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section className={cn("admin-card", className)} {...props} />;
}

export function AdminTable({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-table" aria-label={label}>
        {children}
      </table>
    </div>
  );
}

export function AdminInput({
  label,
  help,
  error,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  help?: string;
  error?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  return (
    <label className={cn("admin-field", className)} htmlFor={inputId}>
      <span>{label}</span>
      <Input
        {...props}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={help || error ? descriptionId : undefined}
      />
      {help || error ? (
        <small
          id={descriptionId}
          className={error ? "admin-field-error" : undefined}
        >
          {error ?? help}
        </small>
      ) : null}
    </label>
  );
}

export function AdminButton(props: ButtonProps) {
  return <Button {...props} />;
}

export interface AdminActionItem {
  label: string;
  icon?: ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
  title?: string;
  onSelect: () => void;
}

export function AdminActionMenu({
  label,
  items,
}: {
  label: string;
  items: AdminActionItem[];
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeForViewportChange = () => setOpen(false);
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", escape);
    window.addEventListener("resize", closeForViewportChange);
    window.addEventListener("scroll", closeForViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("resize", closeForViewportChange);
      window.removeEventListener("scroll", closeForViewportChange, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="admin-action-menu">
      <button
        ref={triggerRef}
        type="button"
        className="admin-icon-button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!open && triggerRef.current) {
            const bounds = triggerRef.current.getBoundingClientRect();
            const menuWidth = 200;
            setMenuPosition({
              top: bounds.bottom + 6,
              left: Math.max(
                8,
                Math.min(
                  window.innerWidth - menuWidth - 8,
                  bounds.right - menuWidth,
                ),
              ),
            });
          }
          setOpen((current) => !current);
        }}
      >
        <MoreHorizontal aria-hidden="true" />
      </button>
      {open ? (
        <div className="admin-menu" role="menu" style={menuPosition}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.title}
              className={item.tone === "danger" ? "is-danger" : undefined}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [busy, onCancel, open]);

  if (!open) return null;
  return (
    <div
      className="admin-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        className="admin-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <button
          type="button"
          className="admin-dialog-close"
          aria-label="Close confirmation"
          disabled={busy}
          onClick={onCancel}
        >
          <X aria-hidden="true" />
        </button>
        <h2 id={titleId}>{title}</h2>
        <div id={descriptionId}>{description}</div>
        <div className="admin-dialog-actions">
          <Button
            ref={cancelRef}
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

export function AdminEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-state admin-state-empty">
      {icon ? <span className="admin-state-icon">{icon}</span> : null}
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function AdminLoadingState({ label }: { label: string }) {
  return (
    <div className="admin-state" role="status" aria-label={label}>
      <span className="admin-skeleton" />
      <span className="admin-skeleton" />
      <span className="admin-skeleton" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function AdminAlert({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="admin-alert admin-alert-danger" role="alert">
      <p>{children}</p>
      {action}
    </div>
  );
}
