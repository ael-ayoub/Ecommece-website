import { useAuth } from "../auth/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  STAFF: "Staff",
};

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { admin } = useAuth();
  const displayName = admin?.email.split("@")[0] ?? "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="fixed left-sidebar-width right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-white px-container-padding">
      <h2 className="font-headline-md text-[22px] font-bold text-primary">{title}</h2>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-primary">notifications</span>
          <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-primary">help</span>
        </div>
        <div className="h-8 w-[1px] bg-outline-variant" />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-label-md text-label-md capitalize text-on-surface">{displayName}</p>
            <p className="text-[11px] font-medium text-on-surface-variant">{admin ? ROLE_LABELS[admin.role] : ""}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container font-headline-md text-body-md text-on-surface-variant">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
