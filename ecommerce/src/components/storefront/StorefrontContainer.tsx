import { cn } from "@/lib/cn";

export function StorefrontContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("client-container", className)}>{children}</div>;
}
