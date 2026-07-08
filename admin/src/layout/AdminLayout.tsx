import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AdminLayoutProps {
  title: string;
  children: ReactNode;
}

export function AdminLayout({ title, children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header title={title} />
      <main className="ml-sidebar-width min-h-screen pt-16">
        <div className="mx-auto max-w-[1440px] p-container-padding">{children}</div>
      </main>
    </div>
  );
}
