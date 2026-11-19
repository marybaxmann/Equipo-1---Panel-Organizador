import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// El proxy apunta al API Gateway de TicketU (:8080), que enruta /api/organizador/* al microservicio
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8080" } },
});
