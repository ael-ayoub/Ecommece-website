import type { Metadata } from "next";
import { Mail, Phone, UserRound } from "lucide-react";
import { AccountNavigation } from "@/components/account/AccountNavigation";
import { getCurrentUser } from "@/lib/get-current-user";

export const metadata: Metadata = {
  title: "My profile | E-Commerce",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  return (
    <main className="client-container py-10 sm:py-14">
      <AccountNavigation />
      <header className="mt-8">
        <p className="client-eyebrow">Your account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">My profile</h1>
        <p className="mt-2 text-sm text-[var(--client-text-secondary)]">
          These details identify your account and help prefill checkout.
        </p>
      </header>
      <dl className="mt-8 grid gap-4 md:grid-cols-3">
        <ProfileItem icon={UserRound} label="Full name" value={user?.name} />
        <ProfileItem icon={Mail} label="Email" value={user?.email} />
        <ProfileItem icon={Phone} label="Phone" value={user?.phone} />
      </dl>
      <p className="mt-6 max-w-2xl rounded-xl bg-[var(--client-surface-muted)] p-4 text-sm leading-6 text-[var(--client-text-secondary)]">
        Profile editing is not currently available. Your checkout delivery
        address is entered separately for each order.
      </p>
    </main>
  );
}

function ProfileItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-5">
      <dt className="flex items-center gap-2 text-sm font-semibold">
        <Icon aria-hidden="true" className="size-4" />
        {label}
      </dt>
      <dd className="mt-3 break-words text-sm text-[var(--client-text-secondary)]">
        {value || "Not provided"}
      </dd>
    </div>
  );
}
