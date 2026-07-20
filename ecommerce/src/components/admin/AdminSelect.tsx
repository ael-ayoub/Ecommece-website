"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  firstEnabledIndex,
  lastEnabledIndex,
  nextEnabledIndex,
} from "@/domain/admin-select";
import { cn } from "@/lib/cn";

export interface AdminSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

interface Props {
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  className?: string;
  menuWidth?: number;
}

interface Position {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

const OPEN_EVENT = "admin-select-open";

export function announceAdminDropdownOpen(id = "external") {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
}

export function AdminSelect({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  placeholder = "Select",
  disabled = false,
  loading = false,
  error = false,
  className,
  menuWidth,
}: Props) {
  const rawId = useId();
  const id = rawId.replaceAll(":", "");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<Position | null>(null);
  const pathname = usePathname();
  const searchKey = useSearchParams().toString();
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];
  const enabledOptions = useMemo(
    () => options.filter((option) => !option.disabled),
    [options],
  );

  function close(restoreFocus = false) {
    setOpen(false);
    setPosition(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function openMenu(preferredIndex?: number) {
    if (disabled || loading || !enabledOptions.length) return;
    announceAdminDropdownOpen(id);
    setActiveIndex(
      preferredIndex ??
        (selectedIndex >= 0 && !options[selectedIndex].disabled
          ? selectedIndex
          : firstEnabledIndex(options)),
    );
    setOpen(true);
  }

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    const desiredWidth = Math.max(menuWidth ?? rect.width, rect.width, 160);
    const width = Math.min(desiredWidth, window.innerWidth - margin * 2);
    const left = Math.min(
      Math.max(margin, rect.left),
      window.innerWidth - width - margin,
    );
    const below = window.innerHeight - rect.bottom - margin - gap;
    const above = rect.top - margin - gap;
    const openAbove = below < 220 && above > below;
    const maxHeight = Math.max(120, Math.min(320, openAbove ? above : below));
    setPosition({
      left,
      top: openAbove
        ? Math.max(margin, rect.top - Math.min(320, maxHeight) - gap)
        : rect.bottom + gap,
      width,
      maxHeight,
    });
  }, [menuWidth]);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, options.length, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        close();
      }
    };
    const onOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) close();
    };
    const onViewport = () => updatePosition();
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("resize", onViewport);
    window.addEventListener("scroll", onViewport, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("resize", onViewport);
      window.removeEventListener("scroll", onViewport, true);
    };
  }, [id, open, updatePosition]);

  useEffect(() => {
    close();
  }, [pathname, searchKey]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    menuRef.current
      ?.querySelector<HTMLElement>(`#admin-select-${id}-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, id, open]);

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close(true);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled || loading) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "Tab" && open) {
      close();
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(firstEnabledIndex(options));
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(lastEnabledIndex(options));
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!open) {
        openMenu(
          direction === 1
            ? selectedIndex >= 0
              ? nextEnabledIndex(options, selectedIndex, 1)
              : firstEnabledIndex(options)
            : selectedIndex >= 0
              ? nextEnabledIndex(options, selectedIndex, -1)
              : lastEnabledIndex(options),
        );
      } else {
        setActiveIndex((current) =>
          nextEnabledIndex(options, current, direction),
        );
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) openMenu();
      else choose(activeIndex);
    }
  }

  const menuStyle: CSSProperties | undefined = position
    ? {
        left: position.left,
        top: position.top,
        width: position.width,
        maxHeight: position.maxHeight,
      }
    : undefined;

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      role="combobox"
      aria-label={ariaLabel ?? label}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? `admin-select-${id}-listbox` : undefined}
      aria-activedescendant={
        open && activeIndex >= 0
          ? `admin-select-${id}-option-${activeIndex}`
          : undefined
      }
      aria-invalid={error || undefined}
      disabled={disabled || loading}
      className={cn("admin-select-trigger", className)}
      onClick={(event) => {
        event.stopPropagation();
        if (open) close();
        else openMenu();
      }}
      onKeyDown={onKeyDown}
      onBlur={() => {
        requestAnimationFrame(() => {
          const focused = document.activeElement;
          if (
            open &&
            focused &&
            !triggerRef.current?.contains(focused) &&
            !menuRef.current?.contains(focused)
          ) {
            close();
          }
        });
      }}
    >
      <span className={selected ? "" : "is-placeholder"}>
        {selected?.icon}
        {loading ? "Loading…" : (selected?.label ?? placeholder)}
      </span>
      {loading ? (
        <LoaderCircle aria-hidden="true" className="admin-select-spinner" />
      ) : (
        <ChevronDown aria-hidden="true" className="admin-select-chevron" />
      )}
    </button>
  );

  return (
    <div className="admin-select">
      {label ? <span className="admin-select-label">{label}</span> : null}
      {trigger}
      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              id={`admin-select-${id}-listbox`}
              role="listbox"
              aria-label={ariaLabel ?? label}
              className="admin-select-menu admin-portal-theme"
              style={menuStyle}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {options.map((option, index) => (
                <button
                  key={option.value}
                  id={`admin-select-${id}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  disabled={option.disabled}
                  className={cn(
                    "admin-select-option",
                    option.value === value && "is-selected",
                    index === activeIndex && "is-active",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerMove={() =>
                    !option.disabled && setActiveIndex(index)
                  }
                  onClick={() => choose(index)}
                >
                  {option.icon ? (
                    <span className="admin-select-option-icon">
                      {option.icon}
                    </span>
                  ) : null}
                  <span>
                    <strong>{option.label}</strong>
                    {option.description ? (
                      <small>{option.description}</small>
                    ) : null}
                  </span>
                  {option.value === value ? (
                    <Check aria-hidden="true" className="admin-select-check" />
                  ) : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
