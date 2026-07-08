import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
}

export function Modal({ title, onClose, children, widthClassName = "max-w-lg" }: ModalProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`w-full ${widthClassName} max-h-[90vh] overflow-y-auto rounded-xl border border-outline-variant bg-white shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-outline-variant px-stack-lg py-stack-md">
          <h3 className="font-headline-md text-headline-md text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-stack-lg">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
