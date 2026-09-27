import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
const element = document.getElementById("page-data");
const embedded = element ? JSON.parse(element.textContent) : null;
const seed = embedded?.pathname === window.location.pathname.replace(/\/$/, "") ? embedded : null;

// The page arrives fully rendered; its data comes from a separate, cached file (see renderShell in
// scripts/prerenderSeo.mjs). Hydrating with that same data keeps the markup identical, so the page stays as it is
// and becomes interactive once the file loads. If the file cannot be loaded, the app starts fresh and loads the
// database itself, which is the path pages without a seed have always taken.
async function start() {
  if (seed?.dataUrl && root.hasChildNodes()) {
    try {
      const response = await fetch(seed.dataUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      hydrateRoot(root, <App initialPage={{ ...seed, data }} />);
      return;
    } catch (error) {
      console.error("Quant page data failed to load; starting without it", error);
    }
  }
  if (seed?.data && root.hasChildNodes()) hydrateRoot(root, <App initialPage={seed} />);
  else createRoot(root).render(<App initialPage={null} />);
}
start();
