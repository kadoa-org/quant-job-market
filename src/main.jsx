import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
const element = document.getElementById("page-data");
const embedded = element ? JSON.parse(element.textContent) : null;
const initialPage = embedded?.pathname === window.location.pathname.replace(/\/$/, "") ? embedded : null;
const app = <App initialPage={initialPage} />;
if (initialPage && root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
