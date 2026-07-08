import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served at myshop.com/admin/* in production (Caddy strips the /admin prefix
// before forwarding to this app — see ../caddy/Caddyfile).
export default defineConfig({
  base: "/admin/",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // Dev-only: forwards to Caddy (docker-compose), which forwards /api/* to the backend.
      // Keeps the browser's view same-origin-ish (same site) so the httpOnly auth cookies behave
      // exactly like they will in production.
      "/api": {
        target: "http://localhost",
        changeOrigin: true,
      },
    },
  },
});
