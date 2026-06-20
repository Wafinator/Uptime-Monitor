import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Forward /api/* to the Express backend. That way the frontend code never
    // needs to know the backend URL and we never deal with CORS in dev.
    proxy: {
      // E2E tests set VITE_API_TARGET so the proxy points at the test backend.
      "/api": process.env.VITE_API_TARGET || "http://localhost:4000",
    },
  },
});
