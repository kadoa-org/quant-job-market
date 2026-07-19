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

// "Jul 2026"-style freshness stamp for titles. We rebuild daily, so unlike
// static listicles the month in the title is always actually true.
const monthYear = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });

// Firm-page slug derived from the (clean) firm NAME, not job.firmSlug — the
// latter is polluted with upstream workflow artifacts ("blackrock-template-v2-retry",
// "mlp-test-2") that would otherwise leak into public URLs.
const firmSlugify = (name) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

// Per-firm aggregates, reused by every page.
const firms = new Map();
for (const j of jobs) {
  const name = j.firmName;
  if (!name) continue;
  if (!firms.has(name))
    firms.set(name, {
      name,
      slug: firmSlugify(name),
      type: j.firmType,
      count: 0,
      locs: new Map(),
      langs: new Map(),
      roles: new Map(),
      jobs: [],
    });
  const f = firms.get(name);
  f.count++;
  f.jobs.push(j);
  if (j.roleCategory) f.roles.set(j.roleCategory, (f.roles.get(j.roleCategory) || 0) + 1);
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

// Firm-name → /firm/<slug> link. Every firm gets a page (built after the job
// loop) that links its individual /job/ pages, so linking firm names in the
// aggregate tables gives Google a crawl path down to the otherwise-orphaned job
// pages. Falls back to plain text if a firm somehow has no slug.
const firmSlugByName = new Map([...firms.values()].filter((f) => f.slug).map((f) => [f.name, f.slug]));
const firmLink = (name) => {
  const s = firmSlugByName.get(name);
  return s ? `<a href="${PREFIX}/firm/${s}">${esc(name)}</a>` : esc(name);
};

// ── page chrome ──────────────────────────────────────────────────────────────

// Static replica of the shared data-kit chrome (SiteHeader/GitHubButton/
// SiteFooter markup mirrors src/kit/index.jsx). All .dk-* classes come from
// the built CSS bundle linked below — the app imports kit.css, so these pages
// inherit the exact site design (and self-hosted Inter) for free.
const GH_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;

const siteHeader = `<header class="dk-header">
  <div class="dk-container dk-header-inner">
    <span class="dk-header-brand-group">
      <a href="${PREFIX}" class="dk-header-brand">📊 Quant Job Market</a>
      <a href="https://www.kadoa.com" target="_blank" rel="noreferrer" class="dk-header-link">by Kadoa</a>
    </span>
    <a class="dk-btn dk-btn--inverse" href="https://github.com/kadoa-org/quant-job-market" target="_blank" rel="noopener noreferrer" aria-label="Star on GitHub" style="text-decoration:none">${GH_ICON}<span class="dk-btn-label">Star on GitHub</span></a>
  </div>
</header>`;

const siteFooter = `<footer class="dk-footer">
  <div class="dk-container dk-footer-inner">
    <nav class="dk-footer-nav" aria-label="Kadoa open datasets">
      <span class="dk-footer-label"><a href="https://www.kadoa.com/datasets">Open data</a> by <a href="https://www.kadoa.com/">Kadoa</a></span>
      <span class="dk-footer-here" aria-current="page">Quant Jobs</span>
      <a href="https://www.kadoa.com/layoffs/">Layoffs Tracker</a>
      <a href="https://www.kadoa.com/congress/">Congress Trades</a>
      <a href="https://www.kadoa.com/potus/">POTUS Tracker</a>
    </nav>
  </div>
</footer>`;

function page({ pathname, title, description, jsonLd, h1, intro, bodyHtml, showMeta = true }) {
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
  /* vertical only — must not reset the .dk-container 0 15px side padding */
  .seo-main{padding-top:28px;padding-bottom:64px}
  .seo-crumbs{font-size:var(--dk-fs-s);color:var(--dk-muted);margin:0 0 20px}
  .seo-crumbs a{color:var(--dk-link)}
  h1{font:700 var(--dk-fs-xxl)/1.15 var(--dk-font);letter-spacing:-0.02em;margin:0 0 10px}
  .seo-lede{font:400 var(--dk-fs-l)/1.5 var(--dk-font);color:var(--dk-muted);max-width:70ch;margin:0 0 24px}
  .seo-lede a,.dk-hint a{color:var(--dk-link)}
  .seo-cta{display:inline-block;margin-top:20px}
  .seo-meta{margin-top:20px}
  .seo-apply{background:var(--dk-link);border-color:var(--dk-link);color:#fff !important;font-weight:600}
  .seo-apply:hover{background:#144e81;border-color:#144e81}
  .seo-jd{max-width:75ch;font:400 var(--dk-fs-m)/1.55 var(--dk-font);margin-top:24px}
  .seo-jd h2,.seo-jd h3,.seo-jd h4{font-weight:700;margin:22px 0 8px;line-height:1.3}
  .seo-jd h2{font-size:var(--dk-fs-l)}
  .seo-jd p,.seo-jd li{margin:0 0 10px}
  .seo-jd ul,.seo-jd ol{padding-left:22px}
  .seo-back{margin-top:28px;font-size:var(--dk-fs-s)}
  .seo-back a{color:var(--dk-link)}
</style>
</head>
<body>
${siteHeader}
<main class="dk-container seo-main">
<nav class="seo-crumbs"><a href="${PREFIX}">Quant Job Market</a> › ${esc(h1)}</nav>
<h1>${esc(h1)}</h1>
<p class="seo-lede">${intro}</p>
${bodyHtml}
${showMeta ? `<p class="dk-hint seo-meta">Aggregated from ${jobs.length.toLocaleString()} live job postings across ${firms.size} quant firms. Updated daily. <a href="${PREFIX}/data/jobs.json">Open dataset (JSON)</a>.</p>` : ""}
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
      `<tr><td class="dk-num">${i + 1}</td><td>${firmLink(f.name)}</td><td>${esc(FIRM_TYPE_LABEL[f.type] ?? "Other")}</td><td class="dk-num">${f.count}</td><td>${esc(topLocs(f.locs))}</td></tr>`,
  )
  .join("\n");
write(
  "/hiring",
  page({
    pathname: "/hiring",
    title: `Which Quant Firms Are Hiring Right Now (${monthYear}, Live) | Quant Job Market`,
    description: `Live count of open roles across ${firms.size} hedge funds, prop shops, and market makers, ranked by number of postings. Updated daily from ${jobs.length.toLocaleString()} job listings.`,
    jsonLd: datasetLd(
      "Quant firms hiring: live open-role counts",
      `Open quant roles across ${firms.size} firms, ranked by posting volume.`,
      `${BASE}/hiring`,
    ),
    h1: "Which Quant Firms Are Hiring Right Now",
    intro: `A live, ranked snapshot of where the quant industry is hiring: ${jobs.length.toLocaleString()} open roles across ${firms.size} hedge funds, prop trading firms, and market makers, updated daily. Unlike static "top firms" lists, these counts reflect what's actually open today. <a href="${PREFIX}">Explore the interactive job board →</a>`,
    bodyHtml: `${kitTable(
      `<th class="dk-num">#</th><th>Firm</th><th>Type</th><th class="dk-num">Open roles</th><th>Top locations</th>`,
      hiringRows,
    )}
<a class="dk-btn seo-cta" href="${PREFIX}">Filter all ${jobs.length.toLocaleString()} roles →</a>`,
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
        `<tr><td class="dk-num">${i + 1}</td><td>${firmLink(f.name)}</td><td>${esc(FIRM_TYPE_LABEL[f.type] ?? "Other")}</td><td class="dk-num">${f.n}</td><td>${esc(topLocs(f.locs))}</td></tr>`,
    )
    .join("\n");
  write(
    `/tech/${tech.slug}`,
    page({
      pathname: `/tech/${tech.slug}`,
      title: `Which Quant Firms Hire ${tech.name} Developers (${monthYear}, Live Data) | Quant Job Market`,
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
        `<tr><td class="dk-num">${i + 1}</td><td>${firmLink(f.name)}</td><td>${esc(FIRM_TYPE_LABEL[f.type] ?? "Other")}</td><td class="dk-num">${f.n}</td><td>${esc(topLangs(f.langs))}</td></tr>`,
    )
    .join("\n");
  write(
    `/location/${loc.slug}`,
    page({
      pathname: `/location/${loc.slug}`,
      title: `Quant Firms Hiring in ${loc.name} (${monthYear}, Live Data) | Quant Job Market`,
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
<a class="dk-btn seo-cta" href="${PREFIX}">Filter all ${jobs.length.toLocaleString()} roles →</a>`,
    }),
  );
}

// ── /<role>-jobs — role hub pages ─────────────────────────────────────────────
//
// OpenQuant's highest-value play: exact-match landing pages for the top role
// queries ("quant researcher jobs", "quant developer jobs", ...). Ours carry a
// live firm-ranked table + disclosed-comp stats instead of a plain job list.

const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmtSal = (n) => `$${Math.round(n / 1000)}k`;

const ROLES = [
  { slug: "quant-researcher-jobs", key: "quantitative_research", name: "Quantitative Researcher" },
  { slug: "quant-developer-jobs", key: "quantitative_development", name: "Quantitative Developer" },
  { slug: "quant-trader-jobs", key: "quantitative_trading", name: "Quantitative Trader" },
  { slug: "machine-learning-engineer-jobs", key: "machine_learning", name: "Machine Learning Engineer" },
  { slug: "data-scientist-jobs", key: "data_science", name: "Data Scientist" },
  { slug: "quant-software-engineer-jobs", key: "software_engineering", name: "Software Engineer" },
  { slug: "hft-jobs", key: "hft_systems", name: "HFT" },
];

for (const role of ROLES) {
  const matched = ranked
    .filter((f) => f.roles.has(role.key))
    .map((f) => ({ name: f.name, type: f.type, n: f.roles.get(role.key), locs: f.locs }))
    .sort((a, b) => b.n - a.n);
  if (matched.length < 8) continue;
  const totalPostings = matched.reduce((s, f) => s + f.n, 0);
  const salaries = jobs.filter((j) => j.roleCategory === role.key && j.salary).map((j) => j.salary);
  const medSal = salaries.length >= 15 ? median(salaries) : null;
  const rows = matched
    .map(
      (f, i) =>
        `<tr><td class="dk-num">${i + 1}</td><td>${firmLink(f.name)}</td><td>${esc(FIRM_TYPE_LABEL[f.type] ?? "Other")}</td><td class="dk-num">${f.n}</td><td>${esc(topLocs(f.locs))}</td></tr>`,
    )
    .join("\n");
  const roleLabel = role.key === "hft_systems" ? "HFT" : `${role.name}`;
  write(
    `/${role.slug}`,
    page({
      pathname: `/${role.slug}`,
      title: `${role.name} Jobs at Quant Firms (${monthYear}): ${totalPostings} Live Roles | Quant Job Market`,
      description: `${totalPostings} open ${role.name} roles at ${matched.length} hedge funds, prop shops, and market makers, ranked by firm${medSal ? `. Median disclosed salary ${fmtSal(medSal)}` : ""}. Live data updated daily.`,
      jsonLd: datasetLd(
        `${role.name} jobs at quant firms`,
        `${totalPostings} open ${role.name} roles across ${matched.length} quant firms.`,
        `${BASE}/${role.slug}`,
      ),
      h1: `${role.name} Jobs at Quant Firms`,
      intro: `${matched.length} hedge funds, prop trading firms, and market makers currently have <strong>${totalPostings} open ${esc(roleLabel)} roles</strong>, ranked below by how many each firm has open right now.${medSal ? ` Median disclosed salary: <strong>${fmtSal(medSal)}</strong> (${salaries.length} postings with published comp — see <a href="${PREFIX}/salaries">quant salaries</a>).` : ""} <a href="${PREFIX}">Filter all roles →</a>`,
      bodyHtml: `${kitTable(
        `<th class="dk-num">#</th><th>Firm</th><th>Type</th><th class="dk-num">Open roles</th><th>Top locations</th>`,
        rows,
      )}
<a class="dk-btn seo-cta" href="${PREFIX}">Browse all ${jobs.length.toLocaleString()} quant roles →</a>`,
    }),
  );
}

// ── /salaries — live disclosed-comp data ──────────────────────────────────────

{
  const disclosed = jobs.filter((j) => j.salary);
  const byRole = ROLES.map((r) => {
    const sal = disclosed.filter((j) => j.roleCategory === r.key).map((j) => j.salary);
    return { name: r.name, slug: r.slug, n: sal.length, med: median(sal) };
  }).filter((r) => r.n >= 10);
  const SEN = [
    ["intern", "Intern"],
    ["junior", "Junior"],
    ["mid", "Mid-level"],
    ["senior", "Senior"],
    ["lead", "Lead"],
    ["vp_director", "VP / Director"],
  ];
  const bySen = SEN.map(([key, label]) => {
    const sal = disclosed.filter((j) => j.seniorityLevel === key).map((j) => j.salary);
    return { label, n: sal.length, med: median(sal) };
  }).filter((r) => r.n >= 10);
  const byFirm = [...firms.values()]
    .map((f) => {
      const sal = disclosed.filter((j) => j.firmName === f.name).map((j) => j.salary);
      return {
        name: f.name,
        type: f.type,
        n: sal.length,
        med: median(sal),
        min: Math.min(...sal),
        max: Math.max(...sal),
      };
    })
    .filter((f) => f.n >= 3)
    .sort((a, b) => b.med - a.med);

  const roleRows = byRole
    .sort((a, b) => b.med - a.med)
    .map(
      (r) =>
        `<tr><td><a href="${PREFIX}/${r.slug}">${esc(r.name)}</a></td><td class="dk-num">${r.n}</td><td class="dk-num">${fmtSal(r.med)}</td></tr>`,
    )
    .join("\n");
  const senRows = bySen
    .map(
      (r) => `<tr><td>${esc(r.label)}</td><td class="dk-num">${r.n}</td><td class="dk-num">${fmtSal(r.med)}</td></tr>`,
    )
    .join("\n");
  const firmRows = byFirm
    .map(
      (f, i) =>
        `<tr><td class="dk-num">${i + 1}</td><td>${firmLink(f.name)}</td><td>${esc(FIRM_TYPE_LABEL[f.type] ?? "Other")}</td><td class="dk-num">${f.n}</td><td class="dk-num">${fmtSal(f.med)}</td><td class="dk-num">${fmtSal(f.min)}–${fmtSal(f.max)}</td></tr>`,
    )
    .join("\n");

  write(
    "/salaries",
    page({
      pathname: "/salaries",
      title: `Quant Salaries (${monthYear}): Live Comp Data from ${disclosed.length} Job Postings | Quant Job Market`,
      description: `Quant compensation from ${disclosed.length} live job postings that disclose salary: medians by role, seniority, and firm (${byFirm.length} firms). Base salary only, updated daily.`,
      jsonLd: datasetLd(
        "Quant salaries: live disclosed compensation",
        `Disclosed base salaries from ${disclosed.length} live quant job postings.`,
        `${BASE}/salaries`,
      ),
      h1: "Quant Salaries: Live Disclosed Comp",
      intro: `Base-salary figures published in <strong>${disclosed.length}</strong> of the ${jobs.length.toLocaleString()} live postings we track (${Math.round((disclosed.length / jobs.length) * 100)}% disclose comp, mostly NYC-based roles where pay-transparency laws apply). Median across all disclosed postings: <strong>${fmtSal(median(disclosed.map((j) => j.salary)))}</strong>. Excludes bonus and PnL-linked comp, which dominate at senior levels.`,
      bodyHtml: `<h2 style="font:700 var(--dk-fs-l)/1.3 var(--dk-font);margin:28px 0 10px">By role</h2>
${kitTable(`<th>Role</th><th class="dk-num">Postings</th><th class="dk-num">Median base</th>`, roleRows)}
<h2 style="font:700 var(--dk-fs-l)/1.3 var(--dk-font);margin:28px 0 10px">By seniority</h2>
${kitTable(`<th>Seniority</th><th class="dk-num">Postings</th><th class="dk-num">Median base</th>`, senRows)}
<h2 style="font:700 var(--dk-fs-l)/1.3 var(--dk-font);margin:28px 0 10px">By firm (3+ disclosed postings)</h2>
${kitTable(
  `<th class="dk-num">#</th><th>Firm</th><th>Type</th><th class="dk-num">Postings</th><th class="dk-num">Median base</th><th class="dk-num">Range</th>`,
  firmRows,
)}
<a class="dk-btn seo-cta" href="${PREFIX}">Browse all ${jobs.length.toLocaleString()} quant roles →</a>`,
    }),
  );
}

// ── /job/<slug> — one page per live posting ──────────────────────────────────
//
// The hub play: host the posting (full description + JobPosting JSON-LD) so
// pages are eligible for Google for Jobs — the one jobs SERP surface not owned
// by LinkedIn/Indeed, and one that REQUIRES the full description in markup.
// "Apply now" hands off to the firm's original posting. Pages regenerate from
// live data daily, so expired postings drop out (404) automatically.

const descriptions = (() => {
  const p = path.join(DIST, "data", "job-descriptions.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
})();

const EMPLOYMENT_TYPE = [
  [/full.?time/i, "FULL_TIME"],
  [/part.?time/i, "PART_TIME"],
  [/intern/i, "INTERN"],
  [/contract|temporary/i, "CONTRACTOR"],
];
const employmentType = (jobType) => (EMPLOYMENT_TYPE.find(([re]) => re.test(jobType || "")) || [])[1];

const SENIORITY_LABEL = { junior: "Junior", mid: "Mid-level", senior: "Senior", lead: "Lead", executive: "Executive" };
const WORK_MODE_LABEL = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" };

let jobPages = 0;
const jobSitemapEntries = [];
for (const j of jobs) {
  const desc = j.slug && descriptions[j.id];
  if (!desc) continue;
  const applyHref = j.applyUrl || j.url;
  if (!applyHref) continue;

  const locStr = (j.locations || []).join(", ");
  const chips = [
    j.firmName,
    FIRM_TYPE_LABEL[j.firmType],
    locStr,
    SENIORITY_LABEL[j.seniorityLevel],
    WORK_MODE_LABEL[j.workMode],
    j.salary ? `$${Math.round(j.salary / 1000)}k` : null,
    j.datePosted ? `Posted ${j.datePosted}` : null,
  ].filter(Boolean);

  // JobPosting structured data (only with datePosted — required by Google).
  const jsonLd = j.datePosted
    ? {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: j.jobTitle,
        description: desc,
        datePosted: j.datePosted,
        hiringOrganization: {
          "@type": "Organization",
          name: j.firmName,
          ...(j.companyLogo ? { logo: j.companyLogo } : {}),
        },
        ...(j.locations?.length
          ? {
              jobLocation: j.locations.map((l) => ({
                "@type": "Place",
                address: { "@type": "PostalAddress", addressLocality: l },
              })),
            }
          : {}),
        ...(j.workMode === "remote" ? { jobLocationType: "TELECOMMUTE" } : {}),
        ...(employmentType(j.jobType) ? { employmentType: employmentType(j.jobType) } : {}),
        ...(j.salary
          ? {
              baseSalary: {
                "@type": "MonetaryAmount",
                currency: "USD",
                value: { "@type": "QuantitativeValue", value: j.salary, unitText: "YEAR" },
              },
            }
          : {}),
        directApply: false,
        url: `${BASE}/job/${j.slug}`,
      }
    : datasetLd(`${j.jobTitle} at ${j.firmName}`, `Open quant role at ${j.firmName}.`, `${BASE}/job/${j.slug}`);

  write(
    `/job/${j.slug}`,
    page({
      pathname: `/job/${j.slug}`,
      title: `${j.jobTitle} at ${j.firmName}${locStr ? ` – ${(j.locations || [])[0]}` : ""} | Quant Job Market`,
      description: `${j.jobTitle} at ${j.firmName}${locStr ? ` (${locStr})` : ""}. Live posting aggregated from the firm's careers page — apply directly. One of ${jobs.length.toLocaleString()} open quant roles tracked daily.`,
      jsonLd,
      h1: j.jobTitle,
      intro: `<span class="dk-hint">${chips.map(esc).join(" · ")}</span>`,
      bodyHtml: `<p>
  <a class="dk-btn seo-apply" href="${esc(applyHref)}" target="_blank" rel="noopener noreferrer nofollow">Apply now →</a>
  <span class="dk-hint" style="margin-left:12px">Applications go to ${esc(j.firmName)}'s own site.</span>
</p>
<article class="seo-jd">${desc}</article>
<p class="seo-back"><a href="${PREFIX}">← Browse all ${jobs.length.toLocaleString()} quant roles</a></p>`,
      showMeta: false,
    }),
  );
  jobSitemapEntries.push({ path: `/job/${j.slug}`, lastmod: j.datePosted || today });
  jobPages++;
}
console.log(`job pages: ${jobPages}`);

// ── /firm/<slug> — one page per firm, linking that firm's job pages ───────────
// Without this the 4k+ /job/ pages are reachable only from the sitemap, which
// Google treats as "Discovered - currently not indexed". Each firm page lists
// the firm's open roles (linked), and the firm names in every aggregate table
// above now link here — a crawl path from indexed pages down to each job page.
// Also a strong "<firm> quant jobs" landing page in its own right.
let firmPages = 0;
for (const f of ranked) {
  if (!f.slug) continue;
  // Only link jobs that actually got a page (same guard as the job loop).
  const linkable = f.jobs
    .filter((j) => j.slug && descriptions[j.id] && (j.applyUrl || j.url))
    .sort((a, b) => (b.datePosted || "").localeCompare(a.datePosted || ""));
  if (!linkable.length) continue;
  const typeLabel = FIRM_TYPE_LABEL[f.type] ?? "finance firm";
  const where = topLocs(f.locs);
  const rows = linkable
    .slice(0, 500)
    .map(
      (j) =>
        `<tr><td><a href="${PREFIX}/job/${esc(j.slug)}">${esc(j.jobTitle)}</a></td><td>${esc((j.locations || []).slice(0, 2).join(", "))}</td><td class="dk-num">${esc(j.datePosted || "")}</td></tr>`,
    )
    .join("\n");
  write(
    `/firm/${f.slug}`,
    page({
      pathname: `/firm/${f.slug}`,
      title: `${f.name} Quant Jobs (${monthYear}): ${f.count} Open Role${f.count === 1 ? "" : "s"} | Quant Job Market`,
      description: `${f.count} open quant role${f.count === 1 ? "" : "s"} at ${f.name} (${typeLabel})${where ? `, hiring in ${where}` : ""}. Titles, locations, and dates — live data updated daily.`,
      jsonLd: datasetLd(`${f.name} open quant roles`, `${f.count} open roles at ${f.name}.`, `${BASE}/firm/${f.slug}`),
      h1: `${f.name} Quant Jobs`,
      intro: `${esc(f.name)} has <strong>${f.count} open quant role${f.count === 1 ? "" : "s"}</strong> right now${where ? `, hiring in ${esc(where)}` : ""}. Each posting below links to full details and a direct apply link. <a href="${PREFIX}/hiring">See all firms hiring →</a>`,
      bodyHtml: `${kitTable(`<th>Role</th><th>Locations</th><th class="dk-num">Posted</th>`, rows)}${
        linkable.length > 500 ? `<p class="dk-hint">Showing 500 of ${f.count} open roles.</p>` : ""
      }`,
    }),
  );
  firmPages++;
}
console.log(`firm pages: ${firmPages}`);

// ── internal links (so the new pages aren't orphaned) ────────────────────────
// React only owns #root, so a <footer> placed AFTER it survives hydration and
// gives crawlers real anchor links into every generated page from the SPA shells.
const techLinks = TECHS.filter((t) => written.includes(`/tech/${t.slug}`))
  .map((t) => `<a href="${PREFIX}/tech/${t.slug}">${esc(t.name)} firms</a>`)
  .join("\n      ");
const locationLinks = LOCATIONS.filter((l) => written.includes(`/location/${l.slug}`))
  .map((l) => `<a href="${PREFIX}/location/${l.slug}">${esc(l.name)}</a>`)
  .join("\n      ");
const roleLinks = ROLES.filter((r) => written.includes(`/${r.slug}`))
  .map((r) => `<a href="${PREFIX}/${r.slug}">${esc(r.name)} jobs</a>`)
  .join("\n      ");
const footer = `    <footer style="max-width:960px;margin:0 auto;padding:24px 15px;font-family:var(--dk-font,Inter,system-ui,sans-serif);font-size:var(--dk-fs-s,.82rem);color:var(--dk-muted,#888);border-top:1px solid var(--dk-rule-soft,#e5e6e7);display:flex;flex-wrap:wrap;gap:6px 14px">
      <strong style="color:var(--dk-ink,#555)">Explore the data:</strong>
      <a href="${PREFIX}/hiring">Which firms are hiring</a>
      <a href="${PREFIX}/salaries">Quant salaries</a>
      ${roleLinks}
      ${techLinks}
      ${locationLinks}
    </footer>`;
// Live counts to replace the stale hardcoded numbers baked into the static shells.
const firmsWithLang = [...firms.values()].filter((f) => f.langs.size > 0).length;
const firmsWithLoc = [...firms.values()].filter((f) => f.locs.size > 0).length;
const jobsStr = jobs.length.toLocaleString();

// Head-term content: a real crawler-visible <h1> + intro + top-firm table for the
// otherwise-empty SPA shells (#root is blank until JS runs). Placed with the footer
// AFTER #root so it survives React hydration, same as the link footer above.
const headRows = ranked
  .slice(0, 20)
  .map(
    (f, i) =>
      `<tr><td class="dk-num">${i + 1}</td><td>${firmLink(f.name)}</td><td>${esc(FIRM_TYPE_LABEL[f.type] ?? "Other")}</td><td class="dk-num">${f.count}</td></tr>`,
  )
  .join("\n");
// Per-shell h1 + intro so the three head-term URLs don't share identical
// crawler-visible content (which would read as duplicate pages). The top-firm
// table below is shared supporting content; the heading and lede differentiate.
const HEAD_CONTENT = {
  "index.html": {
    h1: `Quant Job Market: ${firms.size} Firms Hiring Across ${jobsStr} Open Roles`,
    intro: `A live, daily-updated dataset of ${jobsStr} open quant roles across ${firms.size} hedge funds, prop trading firms, market makers, and asset managers. The 20 firms with the most open postings are listed below; use the interactive board above to filter by role, language, location, and seniority.`,
  },
  "tech-stack.html": {
    h1: `Quant Jobs by Tech Stack: Languages &amp; Tools Across ${firmsWithLang} Firms`,
    intro: `Which programming languages, frameworks, and accelerators quant firms hire for — across ${firmsWithLang} buy-side firms and ${jobsStr} open roles. Explore the interactive tech-stack heatmap above; the firms with the most open roles are listed below.`,
  },
  "locations.html": {
    h1: `Quant Jobs by Location: Where Hedge Funds &amp; Prop Shops Hire`,
    intro: `Where quant hiring happens — job-posting counts by city across ${firmsWithLoc} firms and ${jobsStr} open roles. Explore the interactive location heatmap above; the firms with the most open roles are listed below.`,
  },
};
const headSectionFor = (shell) => {
  const c = HEAD_CONTENT[shell] ?? HEAD_CONTENT["index.html"];
  return `    <section class="dk-container" style="padding:28px 15px 8px">
      <h1 style="font:700 var(--dk-fs-xxl,1.6rem)/1.15 var(--dk-font,Inter,system-ui,sans-serif);letter-spacing:-0.02em;margin:0 0 10px">${c.h1}</h1>
      <p style="font:400 var(--dk-fs-l,1.05rem)/1.5 var(--dk-font,Inter,system-ui,sans-serif);color:var(--dk-muted,#666);max-width:70ch;margin:0 0 20px">${c.intro}</p>
      ${kitTable(`<th class="dk-num">#</th><th>Firm</th><th>Type</th><th class="dk-num">Open roles</th>`, headRows)}
      <p style="margin-top:16px"><a href="${PREFIX}/hiring">See all ${firms.size} firms ranked by open roles →</a> · <a href="${PREFIX}/salaries">Quant salaries</a></p>
    </section>`;
};

for (const shell of ["index.html", "tech-stack.html", "locations.html"]) {
  const p = path.join(DIST, shell);
  if (!fs.existsSync(p)) continue;
  let html = fs.readFileSync(p, "utf8");
  if (html.includes("Explore the data:")) continue; // already injected on an earlier run
  // Refresh stale hardcoded firm/posting counts against live data.
  if (shell === "tech-stack.html") html = html.replace(/\b42\b/g, String(firmsWithLang)).replace(/3,900\+/g, jobsStr);
  if (shell === "locations.html") html = html.replace(/\b38\b/g, String(firmsWithLoc)).replace(/2,700\+/g, jobsStr);
  html = html.replace("</body>", `${headSectionFor(shell)}\n${footer}\n  </body>`);
  fs.writeFileSync(p, html);
}

// ── homepage shell: head-term title with live firm count ─────────────────────
// The static shell title said "Quant Hiring Trends ... 50+ ..." — it never
// targeted the "quant jobs" head term and the firm count had gone stale.
// Patch the built shell with the live count (function replacements: values may
// contain `$`, see renderRoute in the congress prerender for the war story).
{
  const p = path.join(DIST, "index.html");
  const homeTitle = `Quant Jobs & Hiring Trends: Live Data from ${firms.size} Hedge Funds & Prop Shops`;
  let html = fs.readFileSync(p, "utf8");
  html = html
    .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(homeTitle)}</title>`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, (_m, a, b) => `${a}${esc(homeTitle)}${b}`)
    .replace(
      /(<meta property="og:description" content=")[^"]*(")/,
      (_m, a, b) =>
        `${a}${esc(`${jobs.length.toLocaleString()} open postings from ${firms.size} hedge funds, prop shops, and market makers. Interactive treemap, filters, salaries, and tech stack heatmap.`)}${b}`,
    )
    .replace(
      /(<meta name="description" content=")[^"]*(")/,
      (_m, a, b) =>
        `${a}${esc(`Open dataset and interactive viz of ${jobs.length.toLocaleString()} live job postings from ${firms.size} quant firms: hedge funds, prop trading firms, market makers, and asset managers. Filter by role, language, location, and seniority.`)}${b}`,
    )
    .replace(
      /(<meta name="twitter:description" content=")[^"]*(")/,
      (_m, a, b) =>
        `${a}${esc(`${jobs.length.toLocaleString()} open postings from ${firms.size} hedge funds, prop shops, and market makers. Filter, search, explore.`)}${b}`,
    )
    // Homepage JSON-LD carries the same stale firm counts as the sub-page shells.
    .replace(/\b42 buy-side/g, `${firmsWithLang} buy-side`)
    .replace(/\b38 buy-side/g, `${firmsWithLoc} buy-side`);
  fs.writeFileSync(p, html);
}

// ── sitemaps ──────────────────────────────────────────────────────────────────
//
// Segmented by page TYPE (not firm) so Search Console reports indexation per
// segment — the question we'll actually ask is "are the job pages indexed?".
//   sitemap.xml        index (same URL robots.txt already points at)
//   sitemap-core.xml   static SPA shells (from public/, has image extensions)
//   sitemap-pages.xml  aggregate SEO pages — live counts change daily, so a
//                      daily lastmod is honest here
//   sitemap-jobs.xml   job pages — lastmod = datePosted; a perpetual "today"
//                      lastmod is the pattern Google documents as ignored
const XMLH = `<?xml version="1.0" encoding="UTF-8"?>`;
const urlTag = ({ loc, lastmod, changefreq, priority }) =>
  `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${changefreq ? `<changefreq>${changefreq}</changefreq>` : ""}${priority ? `<priority>${priority}</priority>` : ""}</url>`;
const urlset = (rows) =>
  `${XMLH}\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;

const aggregatePaths = written.filter((p) => !p.startsWith("/job/"));
fs.writeFileSync(
  path.join(DIST, "sitemap-pages.xml"),
  urlset(
    aggregatePaths.map((p) => urlTag({ loc: `${BASE}${p}`, lastmod: today, changefreq: "daily", priority: "0.8" })),
  ),
);
fs.writeFileSync(
  path.join(DIST, "sitemap-jobs.xml"),
  urlset(jobSitemapEntries.map((e) => urlTag({ loc: `${BASE}${e.path}`, lastmod: e.lastmod, priority: "0.6" }))),
);
// Overwrites the vite-copied file only if someone reintroduces public/sitemap.xml;
// robots.txt keeps pointing at /quant/sitemap.xml, which is now the index.
fs.writeFileSync(
  path.join(DIST, "sitemap.xml"),
  `${XMLH}\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
    "sitemap-core.xml",
    "sitemap-pages.xml",
    "sitemap-jobs.xml",
  ]
    .map((f) => `  <sitemap><loc>${BASE}/${f}</loc><lastmod>${today}</lastmod></sitemap>`)
    .join("\n")}\n</sitemapindex>\n`,
);

console.log(`prerendered ${written.length} SEO pages (${jobPages} job pages + ${aggregatePaths.join(", ")})`);
console.log(`sitemaps: index + core + pages (${aggregatePaths.length}) + jobs (${jobSitemapEntries.length})`);
