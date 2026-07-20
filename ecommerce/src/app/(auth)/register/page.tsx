import { RegisterForm } from "@/components/auth/RegisterForm";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Create account | E-Commerce",
  description: "Create a client account for profile and order-history access.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
