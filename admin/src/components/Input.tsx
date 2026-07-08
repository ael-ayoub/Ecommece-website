import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = "", id, ...rest }, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="font-label-md text-label-md text-on-surface-variant">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`h-10 rounded-lg border px-3 font-body-md text-body-md text-on-surface outline-none transition-colors ${
          error ? "border-error" : "border-outline-variant focus:border-primary"
        } ${className}`}
        {...rest}
      />
      {error && <p className="text-[12px] text-error">{error}</p>}
    </div>
  );
});
Input.displayName = "Input";
