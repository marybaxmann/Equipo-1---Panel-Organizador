import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// El proxy apunta al API Gateway de TicketU (:8080), que enruta /api/organizador/* al microservicio
export default defineConfig({
  plugins: [react()],
  // Sin Gateway (desarrollo con npm run dev:api): API_PROXY_TARGET=http://localhost:3000 npm run dev:web
  server: { port: 5173, proxy: { "/api": process.env.API_PROXY_TARGET || "http://localhost:8080" } },
});
