import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";

export async function requireAdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");
  return user;
}
