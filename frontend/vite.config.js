import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Forward /api/* to the Express backend so the frontend doesn't need to
    // know the backend's host. No CORS, no hardcoded URLs.
    proxy: {
      // E2E tests set VITE_API_TARGET so the proxy points at the test backend.
      "/api": process.env.VITE_API_TARGET || "http://localhost:4000",
    },
  },
});
