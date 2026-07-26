import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served at www.kadoa.com/quant via the kadoa dashboard's reverse proxy
// (see kadoa-backend apps/dashboard/next.config.mjs). The site lives
// natively under /quant/: `base` prefixes all asset URLs and the build
// output sits in dist/quant/ so the proxy needs no path rewriting.
export default defineConfig({
  base: "/quant/",
  plugins: [react()],
  server: { port: 5181 },
  build: {
    outDir: "dist/quant",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        techStack: resolve(__dirname, "tech-stack.html"),
        locations: resolve(__dirname, "locations.html"),
        about: resolve(__dirname, "about.html"),
      },
    },
  },
});
