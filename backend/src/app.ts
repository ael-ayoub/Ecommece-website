import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { loggerOptions } from "./config/logger.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { redisPlugin } from "./plugins/redis.js";
import { cookiePlugin } from "./plugins/cookie.js";
import { securityPlugin } from "./plugins/security.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";

import { adminAuthRoutes } from "./modules/admin/auth/admin-auth.routes.js";
import { adminProductsRoutes } from "./modules/admin/products/products.routes.js";
import { adminCategoriesRoutes } from "./modules/admin/categories/categories.routes.js";
import { adminOrdersRoutes } from "./modules/admin/orders/orders.routes.js";
import { adminUsersRoutes } from "./modules/admin/users/users.routes.js";
import { adminAnalyticsRoutes } from "./modules/admin/analytics/analytics.routes.js";
import { adminSettingsRoutes } from "./modules/admin/settings/settings.routes.js";
import { adminAuditLogsRoutes } from "./modules/admin/audit-logs/audit-logs.routes.js";

import { authRoutes } from "./modules/auth/auth.routes.js";
import { productsRoutes } from "./modules/products/products.routes.js";
import { categoriesRoutes } from "./modules/categories/categories.routes.js";
import { cartRoutes } from "./modules/cart/cart.routes.js";
import { ordersRoutes } from "./modules/orders/orders.routes.js";
import { addressesRoutes } from "./modules/addresses/addresses.routes.js";

export async function buildApp() {
  const app = Fastify({ logger: loggerOptions }).setValidatorCompiler(validatorCompiler).setSerializerCompiler(serializerCompiler);

  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(cookiePlugin);
  await app.register(securityPlugin);
  await app.register(swaggerPlugin);

  app.get("/api/v1/health", async () => {
    await app.prisma.$queryRaw`SELECT 1`;
    await app.redis.ping();
    return { status: "ok" };
  });

  // Admin API — fully separate auth/guards from the customer API below.
  await app.register(adminAuthRoutes, { prefix: "/api/v1/admin/auth" });
  await app.register(adminProductsRoutes, { prefix: "/api/v1/admin/products" });
  await app.register(adminCategoriesRoutes, { prefix: "/api/v1/admin/categories" });
  await app.register(adminOrdersRoutes, { prefix: "/api/v1/admin/orders" });
  await app.register(adminUsersRoutes, { prefix: "/api/v1/admin/users" });
  await app.register(adminAnalyticsRoutes, { prefix: "/api/v1/admin/analytics" });
  await app.register(adminSettingsRoutes, { prefix: "/api/v1/admin/settings" });
  await app.register(adminAuditLogsRoutes, { prefix: "/api/v1/admin/audit-logs" });

  // Customer API
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(productsRoutes, { prefix: "/api/v1/products" });
  await app.register(categoriesRoutes, { prefix: "/api/v1/categories" });
  await app.register(cartRoutes, { prefix: "/api/v1/cart" });
  await app.register(ordersRoutes, { prefix: "/api/v1/orders" });
  await app.register(addressesRoutes, { prefix: "/api/v1/addresses" });

  return app;
}
