/**
 * Location chart-building primitives.
 *
 * Pure functions that take the jobs[] array and produce:
 *   - aggregateLocations(jobs)           -> { cities, hybridLeaders, totalJobs }
 *   - buildLocationsLollipopSvg(cities)  -> { svg, width, height }
 *   - buildHybridLeaderboardSvg(leaders) -> { svg, width, height }
 *
 * The functions are framework-agnostic so the same logic ships in:
 *   - the kadoa-backend dataset script (Node, generates the OG PNG)
 *   - this React app (renders inline SVG into the dashboard)
 *   - any future consumer (D3, Observable, plain HTML)
 *
 * Update the data by re-running the dataset pipeline:
 *   bun collectors/fetchJobs.ts && bun extractors/classifyJobs.ts &&
 *   bun exporters/vizDataExporter.ts
 * Then copy public/data/jobs.json + jobs.db over and re-run
 * `node scripts/build-db.js`. The chart auto-rebuilds.
 */

const QUANT_ROLES = new Set([
  "quantitative_research",
  "quantitative_trading",
  "quantitative_development",
  "hft_systems",
  "machine_learning",
  "data_science",
  "software_engineering",
  "risk_management",
  "portfolio_management",
]);

const CITY_ALIAS = {
  HKG: "Hong Kong",
  SGP: "Singapore",
  "Greater London": "London",
  Bengaluru: "Bangalore",
  Karnataka: "Bangalore",
  Gurugram: "Gurgaon",
  Gurgram: "Gurgaon",
  "Bala Cynwyd": "Philadelphia",
  "Bala Cynwyd (Philadelphia Area)": "Philadelphia",
  Pennsylvania: "Philadelphia",
  Radnor: "Philadelphia",
  Wayne: "Philadelphia",
  "King of Prussia": "Philadelphia",
  "Jersey City": "New York",
  Greenwich: "New York",
  Stamford: "New York",
  Massachusetts: "Boston",
  Illinois: "Chicago",
  Ireland: "Dublin",
  Australia: "Sydney",
  Zug: "Zurich",
};

const CITY_ISO = {
  "New York": "US",
  London: "GB",
  Chicago: "US",
  "Hong Kong": "HK",
  Singapore: "SG",
  Sydney: "AU",
  Boston: "US",
  Philadelphia: "US",
  Bangalore: "IN",
  Mumbai: "IN",
  Paris: "FR",
  Amsterdam: "NL",
  Dublin: "IE",
  Tokyo: "JP",
  Shanghai: "CN",
  Dubai: "AE",
  Warsaw: "PL",
  Budapest: "HU",
  Gurgaon: "IN",
  Montreal: "CA",
  Miami: "US",
  Zurich: "CH",
  Houston: "US",
  Austin: "US",
};

const ALLOWED_TYPES = new Set(["proprietary", "market_maker", "hedge_fund"]);
const EXCLUDE_FIRMS = new Set(["TransMarket Group"]);
const EXCLUDE_CITIES = new Set(["India", "United States", "Europe", "Asia"]);
const MIN_FIRM_JOBS = 10;
const MIN_CITY_JOBS = 10;
const MAX_CITIES = 22;

function flagEmoji(iso) {
  if (!iso) return "";
  return iso
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1f1e6))
    .join("");
}

function shortenFirm(f) {
  return f
    .replace("Qube RT (QRT)", "QRT")
    .replace("Hudson River Trading", "HRT")
    .replace("Susquehanna (SIG)", "SIG")
    .replace("Squarepoint Capital", "Squarepoint")
    .replace("Brookfield Asset Management", "Brookfield")
    .replace("Balyasny Asset Management", "Balyasny")
    .replace("Stevens Capital Management", "Stevens")
    .replace("Renaissance Technologies", "RenTech")
    .replace("Garda Capital Partners", "Garda Capital")
    .replace("Five Rings Capital", "Five Rings")
    .replace("AQR Capital", "AQR");
}

function escapeText(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function aggregateLocations(jobs) {
  const firmJobs = new Map();
  for (const j of jobs) {
    if (!j.firmName) continue;
    if (!ALLOWED_TYPES.has(j.firmType)) continue;
    if (EXCLUDE_FIRMS.has(j.firmName)) continue;
    if (j.roleCategory && !QUANT_ROLES.has(j.roleCategory)) continue;
    const arr = firmJobs.get(j.firmName) || [];
    arr.push(j);
    firmJobs.set(j.firmName, arr);
  }
  const validFirmJobs = [];
  for (const [, list] of firmJobs) {
    if (list.length >= MIN_FIRM_JOBS) validFirmJobs.push(...list);
  }

  const cityCounts = new Map();
  const cityFirmCounts = new Map();
  const cityTypeCounts = new Map();
  for (const j of validFirmJobs) {
    const seen = new Set();
    for (const raw of j.locations || []) {
      const c = CITY_ALIAS[raw] || raw;
      if (seen.has(c)) continue;
      seen.add(c);
      cityCounts.set(c, (cityCounts.get(c) || 0) + 1);
      let m = cityFirmCounts.get(c);
      if (!m) {
        m = new Map();
        cityFirmCounts.set(c, m);
      }
      m.set(j.firmName, (m.get(j.firmName) || 0) + 1);
      let t = cityTypeCounts.get(c);
      if (!t) {
        t = { proprietary: 0, market_maker: 0, hedge_fund: 0 };
        cityTypeCounts.set(c, t);
      }
      if (j.firmType in t) t[j.firmType]++;
    }
  }

  const cities = [];
  for (const [name, total] of cityCounts) {
    if (total < MIN_CITY_JOBS) continue;
    if (EXCLUDE_CITIES.has(name)) continue;
    const m = cityFirmCounts.get(name);
    if (!m) continue;
    const topFirms = [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([firm, count]) => ({ firm: shortenFirm(firm), count }));
    const byType = cityTypeCounts.get(name) || { proprietary: 0, market_maker: 0, hedge_fund: 0 };
    cities.push({ name, total, topFirms, byType });
  }
  cities.sort((a, b) => b.total - a.total);

  // Flex = hybrid + remote. Both are explicit "you don't have to be in
  // the office five days a week" signals. Most firms use hybrid; a few
  // (DRW, Voleon, Geneva Trading) advertise remote instead.
  const flexByFirm = new Map();
  for (const j of validFirmJobs) {
    let r = flexByFirm.get(j.firmName);
    if (!r) {
      r = { firm: j.firmName, total: 0, hybrid: 0, remote: 0, flex: 0, pct: 0 };
      flexByFirm.set(j.firmName, r);
    }
    r.total++;
    if (j.workMode === "hybrid") {
      r.hybrid++;
      r.flex++;
    } else if (j.workMode === "remote") {
      r.remote++;
      r.flex++;
    }
  }
  const hybridLeaders = [...flexByFirm.values()]
    .filter((r) => r.flex >= 2)
    .map((r) => ({ ...r, firm: shortenFirm(r.firm), pct: (r.flex / r.total) * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  return { cities: cities.slice(0, MAX_CITIES), hybridLeaders, totalJobs: validFirmJobs.length };
}

function annotationFor(c) {
  return { text: c.topFirms.map((f) => `${f.firm} ${f.count}`).join(" · ") };
}

export function buildLocationsLollipopSvg(cities) {
  // Linear-style horizontal bar chart: minimal chrome, near-invisible
  // gridlines, tight Inter-style typography, monochrome accent.
  const W = 1300;
  const left = 24;
  const panelW = W - left * 2;
  const top = 28;
  const rowH = 32;
  const barH = 12;
  const BAR_FILL = "#0f766e";

  const flagW = 26;
  const cityLabelW = 110;
  const totalW = 50;
  const barXStart = left + flagW + cityLabelW + 16;
  const annotationW = 560;
  const barXEnd = left + panelW - totalW - 12 - annotationW;
  const barMaxW = barXEnd - barXStart;
  const annotationX = barXEnd + 20;
  const totalX = left + panelW - totalW;

  const maxCityTotal = Math.max(...cities.map((c) => c.total), 1);
  const xFor = (n) => (n / maxCityTotal) * barMaxW;

  const axisTicks = [];
  for (const v of [0, maxCityTotal]) {
    const tx = barXStart + xFor(v);
    axisTicks.push(
      `<line x1="${tx}" y1="${top}" x2="${tx}" y2="${top + cities.length * rowH}" stroke="rgba(0,0,0,0.04)" stroke-width="1"/>`,
    );
  }

  // Column headers calibrated to Linear's 13.5px/500 secondary scale.
  const headers =
    `<text x="${left + flagW + cityLabelW}" y="${top - 9}" text-anchor="end" font-size="12.5" font-weight="500" fill="#7a7d80">City</text>` +
    `<text x="${annotationX}" y="${top - 9}" font-size="12.5" font-weight="500" fill="#7a7d80">Top firms</text>` +
    `<text x="${totalX + totalW - 4}" y="${top - 9}" text-anchor="end" font-size="12.5" font-weight="500" fill="#7a7d80">Postings</text>`;

  const rows = cities
    .map((c, i) => {
      const y = top + i * rowH + rowH / 2;
      const flag = flagEmoji(CITY_ISO[c.name]);
      const ann = annotationFor(c);
      const barW = xFor(c.total);
      return [
        `<text x="${left + flagW - 4}" y="${y + 6}" text-anchor="end" font-size="18">${flag}</text>`,
        `<text x="${left + flagW + cityLabelW}" y="${y + 5}" text-anchor="end" font-size="14" font-weight="500" fill="#191919">${escapeText(c.name)}</text>`,
        `<rect x="${barXStart}" y="${y - barH / 2}" width="${barW}" height="${barH}" rx="3" fill="${BAR_FILL}" fill-opacity="0.85"/>`,
        `<text x="${annotationX}" y="${y + 5}" font-size="13" fill="#5c5c5f">${escapeText(ann.text)}</text>`,
        `<text x="${totalX + totalW - 4}" y="${y + 5}" text-anchor="end" font-size="14" font-weight="500" fill="#191919" font-variant-numeric="tabular-nums">${c.total}</text>`,
      ].join("");
    })
    .join("");

  const height = top + cities.length * rowH + 8;
  return { svg: axisTicks.join("") + headers + rows, width: W, height };
}

export function buildHybridLeaderboardSvg(hybridLeaders) {
  // Aligned to the locations chart above: same column geometry, same bar
  // height, same Linear-style minimal chrome.
  if (hybridLeaders.length === 0) return { svg: "", width: 0, height: 0 };
  const W = 1300;
  const left = 24;
  const top = 28;
  const rowH = 32;
  const barH = 12;
  const BAR_FILL = "#0f766e";

  const flagW = 26;
  const cityLabelW = 110;
  const labelX = left + flagW + cityLabelW;
  const barX = labelX + 16;
  const barMaxW = 360;

  const maxPct = Math.max(...hybridLeaders.map((l) => l.pct), 60);

  const headers =
    `<text x="${labelX}" y="${top - 9}" text-anchor="end" font-size="12.5" font-weight="500" fill="#7a7d80">Firm</text>` +
    `<text x="${barX}" y="${top - 9}" font-size="12.5" font-weight="500" fill="#7a7d80">% of postings tagged hybrid or remote</text>`;

  const rows = hybridLeaders
    .map((l, i) => {
      const y = top + i * rowH + rowH / 2;
      const barW = (l.pct / maxPct) * barMaxW;
      const breakdown = l.remote > 0 ? `${l.flex}/${l.total} · ${l.remote} remote` : `${l.flex}/${l.total}`;
      return [
        `<text x="${labelX}" y="${y + 5}" text-anchor="end" font-size="14" font-weight="500" fill="#191919">${escapeText(l.firm)}</text>`,
        `<rect x="${barX}" y="${y - barH / 2}" width="${barW}" height="${barH}" rx="3" fill="${BAR_FILL}" fill-opacity="0.85"/>`,
        `<text x="${barX + barW + 8}" y="${y + 5}" font-size="13" font-weight="500" fill="#191919" font-variant-numeric="tabular-nums">${l.pct.toFixed(0)}% <tspan fill="#9a9d9a" font-weight="400">${breakdown}</tspan></text>`,
      ].join("");
    })
    .join("");

  const height = top + hybridLeaders.length * rowH + 8;
  return { svg: headers + rows, width: W, height };
}
