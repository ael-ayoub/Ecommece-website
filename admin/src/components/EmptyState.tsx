interface EmptyStateProps {
  icon?: string;
  message: string;
}

export function EmptyState({ icon = "inbox", message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="material-symbols-outlined text-[28px] text-on-surface-variant">{icon}</span>
      <p className="text-body-md text-on-surface-variant">{message}</p>
    </div>
  );
}
