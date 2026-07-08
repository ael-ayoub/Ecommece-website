import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Overview", icon: "dashboard", end: true },
  { to: "/products", label: "Products", icon: "inventory_2" },
  { to: "/categories", label: "Categories", icon: "category" },
  { to: "/orders", label: "Orders", icon: "shopping_cart" },
  { to: "/users", label: "Users", icon: "group" },
];

const linkClasses = (isActive: boolean) =>
  [
    "flex items-center gap-3 px-stack-sm py-2 rounded-lg transition-colors group",
    isActive ? "bg-white/10 text-on-primary font-bold" : "text-on-primary-container hover:text-on-primary hover:bg-white/5",
  ].join(" ");

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-sidebar-width flex-col bg-primary-container px-stack-md py-stack-lg text-on-primary">
      <div className="mb-10 px-stack-sm">
        <h1 className="font-headline-md text-headline-md tracking-tight text-on-primary">Ecommerce Admin</h1>
        <p className="mt-1 text-[11px] uppercase tracking-widest text-on-primary-container">Management Console</p>
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => linkClasses(isActive)}>
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="font-body-md text-body-md">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/5 pt-6">
        <NavLink to="/settings" className={({ isActive }) => linkClasses(isActive)}>
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span className="font-body-md text-body-md">Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
