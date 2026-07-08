import { Card } from "../components/Card";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Card className="rounded-xl">
      <p className="text-body-md text-on-surface-variant">{title} — coming soon.</p>
    </Card>
  );
}
