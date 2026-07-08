import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    admin?: {
      id: string;
      email: string;
      role: "SUPER_ADMIN" | "STAFF";
    };
    user?: {
      id: string;
    };
    guestId?: string;
  }
}
