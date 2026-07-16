// Seed script — populates the local dev database with realistic sample data.
// Run with: npm run prisma:seed
// Wipes and re-seeds every table it touches, so it's safe to re-run.

import { PrismaClient, Role, OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // Wipe in FK-dependency order so re-running this script is always safe.
  await db.orderItemVariant.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.productVariant.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.user.deleteMany();

  // --- Categories ---------------------------------------------------------
  const [apparel, electronics, homeKitchen] = await Promise.all([
    db.category.create({ data: { name: "Apparel", slug: "apparel" } }),
    db.category.create({ data: { name: "Electronics", slug: "electronics" } }),
    db.category.create({ data: { name: "Home & Kitchen", slug: "home-kitchen" } }),
  ]);

  // --- Users ---------------------------------------------------------------
  // Admin credentials come from the environment (ADMIN_EMAIL/ADMIN_PASSWORD)
  // so the login can be changed by editing .env.local and re-running the
  // seed — never hardcoded here. Demo client accounts stay fixed since
  // they're just sample data, not something you'd need to reconfigure.
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local before seeding — see .env.example.",
    );
  }

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const demoPasswordHash = await bcrypt.hash("Password123!", 10);

  const admin = await db.user.create({
    data: {
      name: "Marketplace Admin",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      phone: "555-0100",
      role: Role.ADMIN,
    },
  });

  const jane = await db.user.create({
    data: {
      name: "Jane Doe",
      email: "jane@example.com",
      passwordHash: demoPasswordHash,
      phone: "555-0101",
      role: Role.CLIENT,
    },
  });

  const ali = await db.user.create({
    data: {
      name: "Ali Karim",
      email: "ali@example.com",
      passwordHash: demoPasswordHash,
      phone: "555-0192",
      role: Role.CLIENT,
    },
  });

  // --- Products + variants ---------------------------------------------------

  const redTShirt = await db.product.create({
    data: {
      categoryId: apparel.id,
      name: "Red T-Shirt",
      description: "100% cotton crew-neck T-shirt, machine washable, true to size.",
      basePrice: "15.00",
      images: ["https://res.cloudinary.com/demo/image/upload/red-tshirt.jpg"],
      variants: {
        create: [
          { variantLabel: "Small", stockQuantity: 12, isActive: true },
          { variantLabel: "Medium", stockQuantity: 8, isActive: true },
          { variantLabel: "Large", stockQuantity: 0, isActive: true }, // zero-stock example
        ],
      },
    },
  });

  const blueJeans = await db.product.create({
    data: {
      categoryId: apparel.id,
      name: "Blue Jeans",
      description: "Straight-fit denim jeans with a mid-rise waist.",
      basePrice: "40.00",
      images: ["https://res.cloudinary.com/demo/image/upload/blue-jeans.jpg"],
      variants: {
        create: [
          { variantLabel: "30", stockQuantity: 6, isActive: true },
          { variantLabel: "32", stockQuantity: 9, isActive: true },
          { variantLabel: "34", stockQuantity: 4, isActive: false }, // disabled example
        ],
      },
    },
  });

  const wirelessMouse = await db.product.create({
    data: {
      categoryId: electronics.id,
      name: "Wireless Mouse",
      description: "2.4GHz wireless mouse with adjustable DPI and USB receiver.",
      basePrice: "22.50",
      images: ["https://res.cloudinary.com/demo/image/upload/wireless-mouse.jpg"],
      variants: {
        create: [
          { variantLabel: "Black", stockQuantity: 25, isActive: true },
          { variantLabel: "White", stockQuantity: 14, isActive: true },
        ],
      },
    },
  });

  const bluetoothSpeaker = await db.product.create({
    data: {
      categoryId: electronics.id,
      name: "Bluetooth Speaker",
      description: "Portable speaker with 10-hour battery life and water resistance.",
      basePrice: "34.99",
      images: ["https://res.cloudinary.com/demo/image/upload/bt-speaker.jpg"],
      variants: {
        create: [{ variantLabel: "Standard", stockQuantity: 18, isActive: true }],
      },
    },
  });

  const blueMug = await db.product.create({
    data: {
      categoryId: homeKitchen.id,
      name: "Blue Mug",
      description: "12oz ceramic mug, dishwasher and microwave safe.",
      basePrice: "8.00",
      images: ["https://res.cloudinary.com/demo/image/upload/blue-mug.jpg"],
      variants: {
        create: [{ variantLabel: "Standard", stockQuantity: 40, isActive: true }],
      },
    },
    include: { variants: true },
  });

  // Fetch variants we need to reference in orders below.
  const redTShirtVariants = await db.productVariant.findMany({
    where: { productId: redTShirt.id },
  });
  const blueJeansVariants = await db.productVariant.findMany({
    where: { productId: blueJeans.id },
  });
  const mouseVariants = await db.productVariant.findMany({
    where: { productId: wirelessMouse.id },
  });
  const speakerVariants = await db.productVariant.findMany({
    where: { productId: bluetoothSpeaker.id },
  });

  const redMedium = redTShirtVariants.find((v) => v.variantLabel === "Medium")!;
  const jeans32 = blueJeansVariants.find((v) => v.variantLabel === "32")!;
  const mouseBlack = mouseVariants.find((v) => v.variantLabel === "Black")!;
  const speakerStandard = speakerVariants.find((v) => v.variantLabel === "Standard")!;

  // --- Orders ------------------------------------------------------------
  // Helper to create an order + its single item + variant snapshot in one go.
  async function createOrder(params: {
    userId: number | null;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    shippingAddress: string;
    status: OrderStatus;
    product: { id: number; name: string };
    variant: { id: number; variantLabel: string; price: unknown; stockQuantity: number };
    basePrice: string;
    quantity: number;
  }) {
    const unitPrice = params.variant.price ?? params.basePrice;
    const totalAmount = (Number(unitPrice) * params.quantity).toFixed(2);

    return db.order.create({
      data: {
        userId: params.userId,
        contactName: params.contactName,
        contactEmail: params.contactEmail,
        contactPhone: params.contactPhone,
        shippingAddress: params.shippingAddress,
        status: params.status,
        totalAmount,
        idempotencyKey: `seed-${params.contactEmail}-${params.product.id}-${params.status}`,
        idempotencyFingerprint: "seed",
        items: {
          create: [
            {
              productId: params.product.id,
              productNameSnapshot: params.product.name,
              variant: {
                create: {
                  productVariantId: params.variant.id,
                  variantLabelSnapshot: params.variant.variantLabel,
                  unitPriceSnapshot: unitPrice as string,
                  quantity: params.quantity,
                },
              },
            },
          ],
        },
      },
    });
  }

  // Logged-in order, Pending — Jane, Red T-Shirt (Medium) x2
  await createOrder({
    userId: jane.id,
    contactName: jane.name,
    contactEmail: jane.email,
    contactPhone: jane.phone,
    shippingAddress: "123 Main St, Springfield",
    status: OrderStatus.PENDING,
    product: redTShirt,
    variant: redMedium,
    basePrice: "15.00",
    quantity: 2,
  });

  // Guest order, Confirmed — Blue Jeans (32) x1
  await createOrder({
    userId: null,
    contactName: "Sara Malik",
    contactEmail: "sara.guest@example.com",
    contactPhone: "555-0155",
    shippingAddress: "45 Oak Ave, Riverdale",
    status: OrderStatus.CONFIRMED,
    product: blueJeans,
    variant: jeans32,
    basePrice: "40.00",
    quantity: 1,
  });

  // Logged-in order, Shipped — Ali, Wireless Mouse (Black) x1
  await createOrder({
    userId: ali.id,
    contactName: ali.name,
    contactEmail: ali.email,
    contactPhone: ali.phone,
    shippingAddress: "9 Elm St, Brookfield",
    status: OrderStatus.SHIPPED,
    product: wirelessMouse,
    variant: mouseBlack,
    basePrice: "22.50",
    quantity: 1,
  });

  // Logged-in order, Delivered — Jane, Bluetooth Speaker x1
  await createOrder({
    userId: jane.id,
    contactName: jane.name,
    contactEmail: jane.email,
    contactPhone: jane.phone,
    shippingAddress: "123 Main St, Springfield",
    status: OrderStatus.DELIVERED,
    product: bluetoothSpeaker,
    variant: speakerStandard,
    basePrice: "34.99",
    quantity: 1,
  });

  // Guest order, Cancelled — Red T-Shirt (Medium) x1
  await createOrder({
    userId: null,
    contactName: "Omar Taleb",
    contactEmail: "omar.guest@example.com",
    contactPhone: "555-0177",
    shippingAddress: "77 Pine Rd, Lakeside",
    status: OrderStatus.CANCELLED,
    product: redTShirt,
    variant: redMedium,
    basePrice: "15.00",
    quantity: 1,
  });

  // Logged-in order, Returned — Ali, Blue Jeans (32) x1
  await createOrder({
    userId: ali.id,
    contactName: ali.name,
    contactEmail: ali.email,
    contactPhone: ali.phone,
    shippingAddress: "9 Elm St, Brookfield",
    status: OrderStatus.RETURNED,
    product: blueJeans,
    variant: jeans32,
    basePrice: "40.00",
    quantity: 1,
  });

  console.log("Seed complete:");
  console.log(`  Categories: ${await db.category.count()}`);
  console.log(`  Products: ${await db.product.count()}`);
  console.log(`  Product variants: ${await db.productVariant.count()}`);
  console.log(`  Users: ${await db.user.count()} (1 admin: ${admin.email})`);
  console.log(`  Orders: ${await db.order.count()}`);
  console.log(`  Order items: ${await db.orderItem.count()}`);
  console.log(
    `  Blue Mug variant id: ${blueMug.variants?.[0]?.id ?? "n/a"} (unused in sample orders)`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
