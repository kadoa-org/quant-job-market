import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: { port: 5181 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        heatmap: resolve(__dirname, "heatmap.html"),
      },
    },
  },
});
