import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, className = "", id, children, ...rest }, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="font-label-md text-label-md text-on-surface-variant">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={`h-10 rounded-lg border bg-white px-3 font-body-md text-body-md text-on-surface outline-none transition-colors ${
          error ? "border-error" : "border-outline-variant focus:border-primary"
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-[12px] text-error">{error}</p>}
    </div>
  );
});
Select.displayName = "Select";
