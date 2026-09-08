import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { offlineManifestPlugin } from "./src/offline/plugin.ts";

export default defineConfig({
  plugins: [react(), offlineManifestPlugin()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
