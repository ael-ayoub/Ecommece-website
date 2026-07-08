import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  STAFF: "Staff",
};

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { admin, logout } = useAuth();
  const displayName = admin?.email.split("@")[0] ?? "";
  const initial = displayName.charAt(0).toUpperCase();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    try {
      await logout();
    } catch {
      toast.error("Couldn't log out cleanly, but your local session was cleared.");
    }
  }

  return (
    <header className="fixed left-sidebar-width right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-white px-container-padding">
      <h2 className="font-headline-md text-[22px] font-bold text-primary">{title}</h2>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-primary">notifications</span>
          <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-primary">help</span>
        </div>
        <div className="h-8 w-[1px] bg-outline-variant" />
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-3 rounded-lg py-1 pl-2 pr-1 hover:bg-surface-container-low"
          >
            <div className="text-right">
              <p className="font-label-md text-label-md capitalize text-on-surface">{displayName}</p>
              <p className="text-[11px] font-medium text-on-surface-variant">{admin ? ROLE_LABELS[admin.role] : ""}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container font-headline-md text-body-md text-on-surface-variant">
              {initial}
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-lg border border-outline-variant bg-white py-1 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
