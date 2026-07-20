import { Banknote, Boxes, ShieldCheck, Tags } from "lucide-react";

const trustItems = [
  {
    label: "Secure Checkout",
    description: "Protected order submission",
    icon: ShieldCheck,
  },
  {
    label: "Real Stock",
    description: "Active SKU availability",
    icon: Boxes,
  },
  {
    label: "Transparent Prices",
    description: "Current Product pricing",
    icon: Tags,
  },
  {
    label: "Cash on Delivery",
    description: "Pay when the order arrives",
    icon: Banknote,
  },
] as const;

export function HomeTrustStrip() {
  return (
    <section className="client-trust-strip" aria-label="Store benefits">
      {trustItems.map(({ label, description, icon: Icon }) => (
        <div key={label} className="client-trust-item">
          <span>
            <Icon aria-hidden="true" />
          </span>
          <div>
            <h2>{label}</h2>
            <p>{description}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
