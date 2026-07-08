interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
  return (
    <label className={`inline-flex items-center gap-2 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-block h-6 w-11 shrink-0 rounded-full border-0 p-0 transition-colors ${checked ? "bg-primary-container" : "bg-surface-container-highest"}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[20px]" : "translate-x-0"
          }`}
        />
      </button>
      {label && <span className="text-body-md text-on-surface">{label}</span>}
    </label>
  );
}
