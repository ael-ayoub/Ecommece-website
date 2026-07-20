import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/storefront/Footer";
import { listCategories } from "@/services/category.service";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await listCategories();
  return (
    <div className="client-storefront flex min-h-dvh flex-col bg-[var(--client-background)] text-[var(--client-text-primary)]">
      <a href="#auth-content" className="client-skip-link">
        Skip to main content
      </a>
      <Header categories={categories} />
      <main
        id="auth-content"
        tabIndex={-1}
        className="client-container grid flex-1 place-items-center py-10 sm:py-16"
      >
        <div className="w-full max-w-md">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
