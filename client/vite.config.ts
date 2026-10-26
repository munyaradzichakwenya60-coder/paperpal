import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    modulePreload: { polyfill: false },
  },
  server: {
    port: 5174,
    proxy: { "/api": "http://localhost:3001" },
  },
});
