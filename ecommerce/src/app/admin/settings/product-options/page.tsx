"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Template {
  id: number;
  name: string;
  ownerType: "SYSTEM" | "USER";
  isPinned: boolean;
  values: { value: string }[];
}

export default function ProductOptionSettingsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [values, setValues] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["admin", "option-templates", "settings"],
    queryFn: () =>
      apiFetch<{ templates: Template[] }>("/api/admin/option-templates"),
  });

  async function createTemplate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/api/admin/option-templates", {
        method: "POST",
        body: JSON.stringify({
          name,
          values: values
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => ({ value })),
        }),
      });
      setName("");
      setValues("");
      queryClient.invalidateQueries({
        queryKey: ["admin", "option-templates"],
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to create preset.",
      );
    }
  }

  async function pin(template: Template) {
    await apiFetch(`/api/admin/option-templates/${template.id}/preference`, {
      method: "PUT",
      body: JSON.stringify({ isPinned: !template.isPinned }),
    });
    queryClient.invalidateQueries({ queryKey: ["admin", "option-templates"] });
  }

  async function disable(template: Template) {
    await apiFetch(`/api/admin/option-templates/${template.id}`, {
      method: "DELETE",
    });
    queryClient.invalidateQueries({ queryKey: ["admin", "option-templates"] });
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold">Product option presets</h1>
      <p className="mb-5 text-sm text-gray-500">
        Changes to a preset affect future Product creation only. Existing
        Products own independent copies.
      </p>
      <form
        onSubmit={createTemplate}
        className="mb-6 grid gap-2 rounded border p-4 md:grid-cols-2"
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Preset name"
        />
        <Input
          value={values}
          onChange={(event) => setValues(event.target.value)}
          placeholder="Comma-separated values"
        />
        <Button type="submit">Save personal preset</Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
      <div className="space-y-2">
        {data?.templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between rounded border p-3"
          >
            <div>
              <strong>{template.name}</strong>
              <p className="text-xs text-gray-500">
                {template.ownerType === "SYSTEM"
                  ? "Built-in, read-only"
                  : "My saved option"}{" "}
                ·{" "}
                {template.values.map((value) => value.value).join(", ") ||
                  "No preset values"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => pin(template)}>
                {template.isPinned ? "Unpin" : "Pin"}
              </Button>
              {template.ownerType === "USER" && (
                <Button type="button" onClick={() => disable(template)}>
                  Disable
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
