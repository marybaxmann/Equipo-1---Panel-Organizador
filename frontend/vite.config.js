import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// El proxy deja front y API en el mismo origen, así la cookie jwt viaja sin CORS ni SameSite
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:3000" } },
});
