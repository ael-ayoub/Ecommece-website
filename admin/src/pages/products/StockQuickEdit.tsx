import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as productsApi from "../../api/products";
import { ApiError } from "../../api/client";

interface StockQuickEditProps {
  productId: string;
  field: "stock_real" | "stock_display";
  value: number;
}

export function StockQuickEdit({ productId, field, value }: StockQuickEditProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const mutation = useMutation({
    mutationFn: (next: number) => productsApi.updateProductStock(productId, { [field]: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setEditing(false);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Couldn't update stock");
    },
  });

  if (!editing) {
    return (
      <button
        className="rounded border-0 bg-transparent p-1.5 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container"
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        title="Click to edit"
      >
        {value}
      </button>
    );
  }

  function save() {
    const next = Number(draft);
    if (!Number.isInteger(next) || next < 0) {
      toast.error("Enter a whole number, 0 or more");
      return;
    }
    if (next === value) {
      setEditing(false);
      return;
    }
    mutation.mutate(next);
  }

  return (
    <input
      autoFocus
      type="number"
      min={0}
      value={draft}
      disabled={mutation.isPending}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") setEditing(false);
      }}
      className="w-16 rounded border border-outline-variant px-1.5 py-0.5 outline-none focus:border-primary"
    />
  );
}
