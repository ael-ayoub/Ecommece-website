interface ErrorStateProps {
  message?: string;
}

export function ErrorState({ message = "Something went wrong while loading this data." }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="material-symbols-outlined text-[28px] text-error">error</span>
      <p className="text-body-md text-on-surface-variant">{message}</p>
    </div>
  );
}
