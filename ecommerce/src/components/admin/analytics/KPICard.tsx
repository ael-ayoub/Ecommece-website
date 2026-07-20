export function KPICard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <article className={`admin-kpi admin-kpi-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
