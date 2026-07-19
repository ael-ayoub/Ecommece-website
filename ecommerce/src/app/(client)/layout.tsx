import { Header } from "@/components/layout/Header";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </>
  );
}
