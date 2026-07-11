/**
 * Build-time SEO content pages for the long-tail queries we can actually win.
 *
 * SERP research (June 2026) showed:
 *   - "[firm] careers" / "quant jobs [city]" are owned by the firms' own
 *     sites + LinkedIn/Indeed, which makes them unwinnable, so we skip them.
 *   - "which quant firms are hiring" is owned by static listicles, and
 *     "which firms use Rust/FPGA/Python" has no live data-backed page at all.
 *     Those are the gaps this script fills.
 *
 * Generates self-contained static HTML (real crawler-visible content, no
 * React mount to wipe it) under dist/, plus sitemap entries:
 *   /hiring/            ranked firms by open postings (the listicle killer)
 *   /tech/<slug>/       firms hiring for a given language/tool
 *
 * Pages link into the interactive app (/, /tech-stack) rather than trying to
 * be the app. Runs after `vite build`; regenerates daily with the data.
 *
 * Usage: node scripts/prerenderSeo.mjs   (wired into `npm run build`)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist", "quant"); // vite outDir (site lives under /quant/)
const PREFIX = "/quant"; // public path prefix behind the www.kadoa.com reverse proxy
const BASE = `https://www.kadoa.com${PREFIX}`;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Pull the built CSS bundle so pages inherit the site's Inter/Tailwind styling.
const cssHref = (() => {
  const m = fs.readFileSync(path.join(DIST, "index.html"), "utf8").match(/assets\/[^"]*\.css/);
  return m ? `${PREFIX}/${m[0]}` : null;
})();

const jobs = JSON.parse(fs.readFileSync(path.join(DIST, "data", "jobs.json"), "utf8"));

const FIRM_TYPE_LABEL = {
  hedge_fund: "Hedge fund",
  proprietary: "Prop trading",
  market_maker: "Market maker",
  asset_manager: "Asset manager",
  private_equity: "Private equity",
};

// Per-firm aggregates, reused by every page.
const firms = new Map();
for (const j of jobs) {
  const name = j.firmName;
  if (!name) continue;
  if (!firms.has(name)) firms.set(name, { name, type: j.firmType, count: 0, locs: new Map(), langs: new Map() });
  const f = firms.get(name);
  f.count++;
  for (const l of j.locations || []) f.locs.set(l, (f.locs.get(l) || 0) + 1);
  for (const l of j.programmingLanguages || []) f.langs.set(l, (f.langs.get(l) || 0) + 1);
  for (const t of j.technologies || []) f.langs.set(t, (f.langs.get(t) || 0) + 1);
}
const topLocs = (m, n = 3) =>
  [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
    .join(", ");

// ── page chrome ──────────────────────────────────────────────────────────────

// Static replica of the shared data-kit chrome (SiteHeader/GitHubButton/
// SiteFooter markup mirrors src/kit/index.jsx). All .dk-* classes come from
// the built CSS bundle linked below — the app imports kit.css, so these pages
// inherit the exact site design (and self-hosted Inter) for free.
const GH_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;

const siteHeader = `<header class="dk-header">
  <div class="dk-container dk-header-inner">
    <span class="dk-header-brand-group">
      <a href="${PREFIX}/" class="dk-header-brand">📊 Quant Job Market</a>
      <a href="https://www.kadoa.com" target="_blank" rel="noreferrer" class="dk-header-link">by Kadoa</a>
    </span>
    <a class="dk-btn dk-btn--inverse" href="https://github.com/kadoa-org/quant-job-market" target="_blank" rel="noopener noreferrer" aria-label="Star on GitHub" style="text-decoration:none">${GH_ICON}<span class="dk-btn-label">Star on GitHub</span></a>
  </div>
</header>`;

const siteFooter = `<footer class="dk-footer">
  <div class="dk-container dk-footer-inner">
    <nav class="dk-footer-nav" aria-label="Kadoa open datasets">
      <span class="dk-footer-label">Open data by Kadoa</span>
      <span class="dk-footer-here" aria-current="page">Quant Jobs</span>
      <a href="https://www.kadoa.com/layoffs/">Layoffs Tracker</a>
      <a href="https://www.kadoa.com/congress/">Congress Trades</a>
    </nav>
  </div>
</footer>`;

function page({ pathname, title, description, jsonLd, h1, intro, bodyHtml }) {
  const url = `${BASE}${pathname}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="icon" type="image/svg+xml" href="${PREFIX}/favicon.svg" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Quant Job Market" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${BASE}/screenshot.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${BASE}/screenshot.png" />
${cssHref ? `<link rel="stylesheet" href="${cssHref}" />` : ""}
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
  /* Page-only styles; the look comes from the kit's .dk-* classes in the bundle CSS. */
  body{margin:0;background:var(--dk-bg);color:var(--dk-ink);font-family:var(--dk-font)}
  .seo-main{padding:28px 0 64px}
  .seo-crumbs{font-size:var(--dk-fs-s);color:var(--dk-muted);margin:0 0 20px}
  .seo-crumbs a{color:var(--dk-link)}
  h1{font:700 var(--dk-fs-xxl)/1.15 var(--dk-font);letter-spacing:-0.02em;margin:0 0 10px}
  .seo-lede{font:400 var(--dk-fs-l)/1.5 var(--dk-font);color:var(--dk-muted);max-width:70ch;margin:0 0 24px}
  .seo-lede a,.dk-hint a{color:var(--dk-link)}
  .seo-cta{display:inline-block;margin-top:20px}
  .seo-meta{margin-top:20px}
</style>
</head>
<body>
${siteHeader}
<main class="dk-container seo-main">
<nav class="seo-crumbs"><a href="${PREFIX}/">Quant Job Market</a> › ${esc(h1)}</nav>
<h1>${esc(h1)}</h1>
<p class="seo-lede">${intro}</p>
${bodyHtml}
<p class="dk-hint seo-meta">Aggregated from ${jobs.length.toLocaleString()} live job postings across ${firms.size} quant firms. Updated daily. <a href="${PREFIX}/data/jobs.json">Open dataset (JSON)</a>.</p>
</main>
${siteFooter}
</body>
</html>`;
}

const today = new Date().toISOString().slice(0, 10);
const datasetLd = (name, desc, url) => ({
  "@context": "https://schema.org",
  "@type": "Dataset",
  name,
  description: desc,
  url,
  isAccessibleForFree: true,
  dateModified: today,
  creator: { "@type": "Organization", name: "Kadoa", url: "https://kadoa.com" },
  license: "https://creativecommons.org/licenses/by/4.0/",
});

const written = [];
function write(pathname, html) {
  const dir = path.join(DIST, pathname.slice(1));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  written.push(pathname);
}

// ── /hiring ──────────────────────────────────────────────────────────────────

// Kit-styled table (classes from the bundle CSS; dk-num = right-aligned numeric)
const kitTable = (headHtml, rowsHtml) =>
  `<div class="dk-table-wrap"><table class="dk-table"><thead><tr>${headHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;

const ranked = [...firms.values()].sort((a, b) => b.count - a.count);
const hiringRows = ranked
  .map(
    (f, i) =>
      `<tr><td class="dk-num">${i + 1}</td><td>${esc(f.name)}</td><td>${esc(FIRM_TYPE_LABEL[f.type] ?? "Other")}</td><td class="dk-num">${f.count}</td><td>${esc(topLocs(f.locs))}</td></tr>`,
  )
  .join("\n");
write(
  "/hiring",
  page({
    pathname: "/hiring",
    title: "Which Quant Firms Are Hiring Right Now (Live) | Quant Job Market",
    description: `Live count of open roles across ${firms.size} hedge funds, prop shops, and market makers, ranked by number of postings. Updated daily from ${jobs.length.toLocaleString()} job listings.`,
    jsonLd: datasetLd(
      "Quant firms hiring: live open-role counts",
      `Open quant roles across ${firms.size} firms, ranked by posting volume.`,
      `${BASE}/hiring`,
    ),
    h1: "Which Quant Firms Are Hiring Right Now",
    intro: `A live, ranked snapshot of where the quant industry is hiring: ${jobs.length.toLocaleString()} open roles across ${firms.size} hedge funds, prop trading firms, and market makers, updated daily. Unlike static "top firms" lists, these counts reflect what's actually open today. <a href="${PREFIX}/">Explore the interactive job board →</a>`,
    bodyHtml: `${kitTable(
      `<th class="dk-num">#</th><th>Firm</th><th>Type</th><th class="dk-num">Open roles</th><th>Top locations</th>`,
      hiringRows,
    )}
<a class="dk-btn seo-cta" href="${PREFIX}/">Filter all ${jobs.length.toLocaleString()} roles →</a>`,
  }),
);

// ── /tech/<slug> ──────────────────────────────────────────────────────────────

// Curated set: well-covered (>= ~15 firms) AND a real search query. OCaml is
// skipped (Jane-Street-only; their own posts own that SERP).
const TECHS = [
  { slug: "python", name: "Python" },
  { slug: "cpp", name: "C++" },
  { slug: "rust", name: "Rust" },
  { slug: "java", name: "Java" },
  { slug: "csharp", name: "C#" },
  { slug: "go", name: "Go" },
  { slug: "sql", name: "SQL" },
  { slug: "fpga", name: "FPGA" },
];

for (const tech of TECHS) {
  const matched = ranked
    .filter((f) => f.langs.has(tech.name))
    .map((f) => ({ name: f.name, type: f.type, n: f.langs.get(tech.name), locs: f.locs }))
    .sort((a, b) => b.n - a.n);
  if (matched.length < 5) continue;
  const totalPostings = matched.reduce((s, f) => s + f.n, 0);
  const rows = matched
    .map(
      (f, i) =>
        `<tr><td class="dk-num">${i + 1}</td><td>${esc(f.name)}</td><td>${esc(FIRM_TYPE_LABEL[f.type] ?? "Other")}</td><td class="dk-num">${f.n}</td><td>${esc(topLocs(f.locs))}</td></tr>`,
    )
    .join("\n");
  write(
    `/tech/${tech.slug}`,
    page({
      pathname: `/tech/${tech.slug}`,
      title: `Which Quant Firms Hire ${tech.name} Developers (Live Data) | Quant Job Market`,
      description: `${matched.length} hedge funds, prop shops, and market makers with open ${tech.name} roles, ranked by posting count, with locations. Live data from ${jobs.length.toLocaleString()} quant job listings, updated daily.`,
      jsonLd: datasetLd(
        `Quant firms hiring ${tech.name} developers`,
        `${matched.length} quant firms with open ${tech.name} roles (${totalPostings} postings).`,
        `${BASE}/tech/${tech.slug}`,
      ),
      h1: `Quant Firms Hiring ${tech.name} Developers`,
      intro: `${matched.length} hedge funds, prop trading firms, and market makers currently have open roles mentioning <strong>${esc(tech.name)}</strong>: ${totalPostings} postings in all. Ranked by how many ${esc(tech.name)} roles each firm has open right now. <a href="${PREFIX}/tech-stack">See the full language heatmap →</a>`,
      bodyHtml: `${kitTable(
        `<th class="dk-num">#</th><th>Firm</th><th>Type</th><th class="dk-num">${esc(tech.name)} roles</th><th>Top locations</th>`,
        rows,
      )}
<a class="dk-btn seo-cta" href="${PREFIX}/tech-stack">Explore the interactive tech-stack heatmap →</a>`,
    }),
  );
}

// ── /location/<slug> ──────────────────────────────────────────────────────────

// Same winnable pattern as /hiring and /tech: "quant jobs [city]" SERPs are
// owned by LinkedIn/Indeed and unwinnable, but "which quant firms are hiring in
// [city]" has no live data-backed page — a firm-ranked table is the gap we fill.
// Curated to hub cities where coverage is broad (built only if >= 8 firms).
const LOCATIONS = [
  { slug: "new-york", name: "New York" },
  { slug: "london", name: "London" },
  { slug: "singapore", name: "Singapore" },
  { slug: "hong-kong", name: "Hong Kong" },
  { slug: "chicago", name: "Chicago" },
  { slug: "sydney", name: "Sydney" },
  { slug: "boston", name: "Boston" },
  { slug: "paris", name: "Paris" },
  { slug: "mumbai", name: "Mumbai" },
  { slug: "miami", name: "Miami" },
  { slug: "amsterdam", name: "Amsterdam" },
  { slug: "austin", name: "Austin" },
];

const topLangs = (m, n = 3) =>
  [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
    .join(", ");

for (const loc of LOCATIONS) {
  const matched = ranked
    .filter((f) => f.locs.has(loc.name))
    .map((f) => ({ name: f.name, type: f.type, n: f.locs.get(loc.name), langs: f.langs }))
    .sort((a, b) => b.n - a.n);
  if (matched.length < 8) continue;
  const totalPostings = matched.reduce((s, f) => s + f.n, 0);
  const rows = matched
    .map(
      (f, i) =>
        `<tr><td class="dk-num">${i + 1}</td><td>${esc(f.name)}</td><td>${esc(FIRM_TYPE_LABEL[f.type] ?? "Other")}</td><td class="dk-num">${f.n}</td><td>${esc(topLangs(f.langs))}</td></tr>`,
    )
    .join("\n");
  write(
    `/location/${loc.slug}`,
    page({
      pathname: `/location/${loc.slug}`,
      title: `Quant Firms Hiring in ${loc.name} Right Now (Live Data) | Quant Job Market`,
      description: `${matched.length} hedge funds, prop shops, and market makers with open quant roles in ${loc.name} — ${totalPostings} postings, ranked by firm. Live data updated daily.`,
      jsonLd: datasetLd(
        `Quant firms hiring in ${loc.name}`,
        `${matched.length} quant firms with open roles in ${loc.name} (${totalPostings} postings).`,
        `${BASE}/location/${loc.slug}`,
      ),
      h1: `Quant Firms Hiring in ${loc.name}`,
      intro: `${matched.length} hedge funds, prop trading firms, and market makers currently have open roles in <strong>${esc(loc.name)}</strong>: ${totalPostings} postings in all, ranked by how many ${esc(loc.name)} roles each firm has open right now. <a href="${PREFIX}/locations">Compare all locations →</a>`,
      bodyHtml: `${kitTable(
        `<th class="dk-num">#</th><th>Firm</th><th>Type</th><th class="dk-num">${esc(loc.name)} roles</th><th>Top tech</th>`,
        rows,
      )}
<a class="dk-btn seo-cta" href="${PREFIX}/">Filter all ${jobs.length.toLocaleString()} roles →</a>`,
    }),
  );
}

// ── internal links (so the new pages aren't orphaned) ────────────────────────
// React only owns #root, so a <footer> placed AFTER it survives hydration and
// gives crawlers real anchor links into every generated page from the SPA shells.
const techLinks = TECHS.filter((t) => written.includes(`/tech/${t.slug}`))
  .map((t) => `<a href="${PREFIX}/tech/${t.slug}/">${esc(t.name)} firms</a>`)
  .join("\n      ");
const locationLinks = LOCATIONS.filter((l) => written.includes(`/location/${l.slug}`))
  .map((l) => `<a href="${PREFIX}/location/${l.slug}/">${esc(l.name)}</a>`)
  .join("\n      ");
const footer = `    <footer style="max-width:960px;margin:0 auto;padding:24px 15px;font-family:var(--dk-font,Inter,system-ui,sans-serif);font-size:var(--dk-fs-s,.82rem);color:var(--dk-muted,#888);border-top:1px solid var(--dk-rule-soft,#e5e6e7);display:flex;flex-wrap:wrap;gap:6px 14px">
      <strong style="color:var(--dk-ink,#555)">Explore the data:</strong>
      <a href="${PREFIX}/hiring/">Which firms are hiring</a>
      ${techLinks}
      ${locationLinks}
    </footer>`;
for (const shell of ["index.html", "tech-stack.html", "locations.html"]) {
  const p = path.join(DIST, shell);
  if (!fs.existsSync(p)) continue;
  let html = fs.readFileSync(p, "utf8");
  if (html.includes("Explore the data:")) continue;
  html = html.replace("</body>", `${footer}\n  </body>`);
  fs.writeFileSync(p, html);
}

// ── sitemap (merge with the static one Vite copied from public/) ──────────────

const sitemapPath = path.join(DIST, "sitemap.xml");
const existing = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
const existingLocs = new Set([...existing.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
const newUrls = written
  .map((p) => `${BASE}${p}`)
  .filter((u) => !existingLocs.has(u))
  .map(
    (u) =>
      `  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`,
  );
if (existing.includes("</urlset>")) {
  fs.writeFileSync(sitemapPath, existing.replace("</urlset>", `${newUrls.join("\n")}\n</urlset>`));
} else {
  fs.writeFileSync(
    sitemapPath,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${newUrls.join("\n")}\n</urlset>\n`,
  );
}

console.log(`prerendered ${written.length} SEO pages: ${written.join(", ")}`);
console.log(`sitemap: +${newUrls.length} urls`);
