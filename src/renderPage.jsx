import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App";
export { parseUrl } from "./App";
export { readJobData } from "./jobData";
export function renderPage(initialPage) { return renderToString(<App initialPage={initialPage} />); }
