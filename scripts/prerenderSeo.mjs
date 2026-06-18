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
const DIST = path.join(ROOT, "dist");
const BASE = "https://quant.kadoa.com";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Pull the built CSS bundle so pages inherit the site's Inter/Tailwind styling.
const cssHref = (() => {
  const m = fs.readFileSync(path.join(DIST, "index.html"), "utf8").match(/assets\/[^"]*\.css/);
  return m ? `/${m[0]}` : null;
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

function page({ pathname, title, description, jsonLd, h1, intro, bodyHtml }) {
  const url = `${BASE}${pathname}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
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
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
${cssHref ? `<link rel="stylesheet" href="${cssHref}" />` : ""}
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
  body{font-family:Inter,system-ui,sans-serif;background:#f2f2f3;color:#191919;margin:0}
  .wrap{max-width:880px;margin:0 auto;padding:40px 20px 80px}
  a{color:#2f5fe0;text-decoration:none}a:hover{text-decoration:underline}
  h1{font-size:1.9rem;font-weight:700;letter-spacing:-.02em;margin:0 0 12px}
  .lede{font-size:1.05rem;color:#444;line-height:1.5;margin:0 0 28px}
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e3e3e6;border-radius:10px;overflow:hidden}
  th,td{text-align:left;padding:10px 14px;font-size:.92rem;border-bottom:1px solid #eee}
  th{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:#777;font-weight:600}
  td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
  tr:last-child td{border-bottom:none}
  .meta{font-size:.8rem;color:#888;margin-top:24px}
  .cta{display:inline-block;margin:24px 0;padding:10px 18px;background:#191919;color:#fff;border-radius:8px;font-weight:600}
  .cta:hover{text-decoration:none;opacity:.9}
  nav{font-size:.85rem;color:#888;margin-bottom:24px}
</style>
</head>
<body>
<div class="wrap">
<nav><a href="/">Quant Job Market</a> › ${esc(h1)}</nav>
<h1>${esc(h1)}</h1>
<p class="lede">${intro}</p>
${bodyHtml}
<p class="meta">Aggregated from ${jobs.length.toLocaleString()} live job postings across ${firms.size} quant firms. Updated daily. <a href="/data/jobs.json">Open dataset (JSON)</a>.</p>
</div>
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

const ranked = [...firms.values()].sort((a, b) => b.count - a.count);
const hiringRows = ranked
  .map(
    (f, i) =>
      `<tr><td class="n">${i + 1}</td><td>${esc(f.name)}</td><td>${esc(FIRM_TYPE_LABEL[f.type] ?? "Other")}</td><td class="n">${f.count}</td><td>${esc(topLocs(f.locs))}</td></tr>`,
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
    intro: `A live, ranked snapshot of where the quant industry is hiring: ${jobs.length.toLocaleString()} open roles across ${firms.size} hedge funds, prop trading firms, and market makers, updated daily. Unlike static "top firms" lists, these counts reflect what's actually open today. <a href="/">Explore the interactive job board →</a>`,
    bodyHtml: `<table><thead><tr><th class="n">#</th><th>Firm</th><th>Type</th><th class="n">Open roles</th><th>Top locations</th></tr></thead><tbody>${hiringRows}</tbody></table>
<a class="cta" href="/">Filter all ${jobs.length.toLocaleString()} roles →</a>`,
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
        `<tr><td class="n">${i + 1}</td><td>${esc(f.name)}</td><td>${esc(FIRM_TYPE_LABEL[f.type] ?? "Other")}</td><td class="n">${f.n}</td><td>${esc(topLocs(f.locs))}</td></tr>`,
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
      intro: `${matched.length} hedge funds, prop trading firms, and market makers currently have open roles mentioning <strong>${esc(tech.name)}</strong>: ${totalPostings} postings in all. Ranked by how many ${esc(tech.name)} roles each firm has open right now. <a href="/tech-stack">See the full language heatmap →</a>`,
      bodyHtml: `<table><thead><tr><th class="n">#</th><th>Firm</th><th>Type</th><th class="n">${esc(tech.name)} roles</th><th>Top locations</th></tr></thead><tbody>${rows}</tbody></table>
<a class="cta" href="/tech-stack">Explore the interactive tech-stack heatmap →</a>`,
    }),
  );
}

// ── internal links (so the new pages aren't orphaned) ────────────────────────
// React only owns #root, so a <footer> placed AFTER it survives hydration and
// gives crawlers real anchor links into every generated page from the SPA shells.
const techLinks = TECHS.filter((t) => written.includes(`/tech/${t.slug}`))
  .map((t) => `<a href="/tech/${t.slug}/">${esc(t.name)} firms</a>`)
  .join("\n      ");
const footer = `    <footer style="max-width:880px;margin:0 auto;padding:24px 20px;font-family:Inter,system-ui,sans-serif;font-size:.82rem;color:#888;border-top:1px solid #e3e3e6">
      <strong style="color:#555">Explore the data:</strong>
      <a href="/hiring/">Which firms are hiring</a>
      ${techLinks}
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
