import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = "Confirm", isLoading, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel} widthClassName="max-w-sm">
      <p className="text-body-md text-on-surface-variant">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
