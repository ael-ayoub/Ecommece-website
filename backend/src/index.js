import Fastify from "fastify";
import pg from "pg";
import Redis from "ioredis";

const app = Fastify({ logger: true });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

app.get("/api/health", async () => {
  const [{ rows }] = await Promise.all([pool.query("select 1")]);
  const redisPing = await redis.ping();
  return { status: "ok", db: rows.length === 1, redis: redisPing === "PONG" };
});

const port = Number(process.env.PORT) || 3000;
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
