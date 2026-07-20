import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/storefront/Footer";
import { listCategories } from "@/services/category.service";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await listCategories();

  return (
    <div className="client-storefront flex min-h-dvh flex-col bg-[var(--client-background)] text-[var(--client-text-primary)]">
      <a href="#main-content" className="client-skip-link">
        Skip to main content
      </a>
      <Header categories={categories} />
      <div id="main-content" tabIndex={-1} className="client-main flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
}
