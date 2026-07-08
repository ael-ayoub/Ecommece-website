import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
}

export function Button({ variant = "primary", isLoading, disabled, className = "", children, ...rest }: ButtonProps) {
  const base = "h-10 px-4 rounded-lg font-label-md text-label-md transition-colors inline-flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-primary-container text-on-primary hover:bg-primary-container/90 disabled:opacity-50",
    secondary: "bg-white border border-outline-variant text-on-surface hover:border-primary disabled:opacity-50",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || isLoading} {...rest}>
      {isLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {children}
    </button>
  );
}
