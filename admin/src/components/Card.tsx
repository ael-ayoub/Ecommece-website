import type { HTMLAttributes } from "react";

export function Card({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl border border-outline-variant bg-white p-stack-lg ${className}`} {...rest}>
      {children}
    </div>
  );
}
