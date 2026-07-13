import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";

export const metadata: Metadata = {
  title: "E-Commerce Platform",
  description: "E-commerce platform v1 — Cash on Delivery marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
