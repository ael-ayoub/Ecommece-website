import { prisma } from "../lib/prisma-client.js";
import { hashSecret } from "../lib/hash.js";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-immediately";

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists — skipping.`);
    return;
  }

  const passwordHash = await hashSecret(password);
  await prisma.admin.create({
    data: { email, password_hash: passwordHash, role: "SUPER_ADMIN" },
  });

  console.log(`Created super admin ${email}.`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`No SEED_ADMIN_PASSWORD set — used the default "${password}". Change it immediately after first login.`);
  }

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      store_name: "My Store",
      contact_email: email,
      admin_notification_email: email,
      currency: "USD",
      default_locale: "en",
      enabled_locales: ["en"],
      guest_checkout_enabled: true,
      low_stock_threshold: 5,
      default_delivery_cost: 0,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
