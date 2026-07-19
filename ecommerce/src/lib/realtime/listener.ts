import { EventEmitter } from "node:events";
import { Client } from "pg";

// Self-hosted stand-in for Supabase Realtime (architecture.md §10's
// documented fallback: "Socket.io remains a valid drop-in alternative" for
// a host with a long-lived process — this project has no Supabase project
// or credentials provisioned, so this uses Postgres's own LISTEN/NOTIFY
// instead, which is what Supabase Realtime is itself built on).
//
// One dedicated, persistent `pg` connection LISTENs on the `order_changes`
// channel for the lifetime of the Node process, and re-broadcasts each
// NOTIFY as a local event that any number of SSE route handlers (one per
// connected admin browser tab) can subscribe to. Prisma's pooled/short-lived
// connections are unsuitable for LISTEN — a raw node-postgres Client is used
// here specifically because it needs one connection held open indefinitely.
//
// Deployment note: this requires a long-lived Node process, same as the
// Socket.io alternative architecture.md already calls out — it works as-is
// for a traditional server/container, but would need adapting (e.g. to
// actual Supabase Realtime) for Vercel's serverless functions, which don't
// hold a persistent process between invocations.

declare global {
  // eslint-disable-next-line no-var
  var __orderListenerClient: Client | undefined;
  // eslint-disable-next-line no-var
  var __orderListenerStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __orderEvents: EventEmitter | undefined;
}

// Guarded on `global`, not a plain module-level const — Next.js dev can
// re-evaluate a route module's top-level scope across requests (Fast
// Refresh), which would otherwise silently create a *new* EventEmitter on
// each re-evaluation while the long-lived pg Client's "notification"
// handler (bound once, in connect() below) keeps emitting into the
// *original* one. Mirrors src/lib/db.ts's Prisma singleton guard.
export const orderEvents = global.__orderEvents ?? new EventEmitter();
orderEvents.setMaxListeners(0); // unbounded — one listener per connected admin tab
global.__orderEvents = orderEvents;

const CHANNEL = "order_changes";
const RECONNECT_DELAY_MS = 2000;

function connect() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  global.__orderListenerClient = client;

  client.on("notification", (msg) => {
    if (msg.channel !== CHANNEL || !msg.payload) return;
    try {
      orderEvents.emit("order-changed", JSON.parse(msg.payload));
    } catch {
      // malformed payload — ignore rather than crash the listener
    }
  });

  client.on("error", () => {
    // Connection dropped — reconnect after a short delay rather than
    // leaving the process with a dead LISTEN connection forever.
    scheduleReconnect();
  });

  client
    .connect()
    .then(() => client.query(`LISTEN ${CHANNEL}`))
    .catch(() => {
      scheduleReconnect();
    });
}

function scheduleReconnect() {
  const dead = global.__orderListenerClient;
  global.__orderListenerClient = undefined;
  dead?.end().catch(() => {});
  setTimeout(connect, RECONNECT_DELAY_MS);
}

// Lazily starts exactly one LISTEN connection per Node process (guarded on
// `global` the same way src/lib/db.ts guards the Prisma singleton, so
// Next.js dev's module-reload doesn't spawn a second connection).
export function ensureOrderListener() {
  if (global.__orderListenerStarted) return;
  global.__orderListenerStarted = true;
  connect();
}
