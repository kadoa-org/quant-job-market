import React, { useMemo } from "react";

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
};

const EXCLUDE_FIRMS = new Set(["TransMarket Group"]);
const EXCLUDE_CITIES = new Set(["India", "United States", "Europe", "Asia"]);
const ALLOWED_TYPES = new Set(["proprietary", "market_maker", "hedge_fund"]);
const MIN_FIRM_JOBS = 10;
const MIN_CITY_JOBS = 10;
const MAX_CITIES = 14;

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

function aggregate(jobs) {
  const firmJobs = new Map();
  for (const j of jobs) {
    if (!j.firmName) continue;
    if (!ALLOWED_TYPES.has(j.firmType)) continue;
    if (EXCLUDE_FIRMS.has(j.firmName)) continue;
    const arr = firmJobs.get(j.firmName) || [];
    arr.push(j);
    firmJobs.set(j.firmName, arr);
  }
  const validFirmJobs = [];
  for (const [, list] of firmJobs) {
    if (list.length >= MIN_FIRM_JOBS) validFirmJobs.push(...list);
  }

  const cities = new Map();
  const cityFirmCounts = new Map();
  for (const j of validFirmJobs) {
    const seen = new Set();
    for (const raw of j.locations || []) {
      const c = CITY_ALIAS[raw] || raw;
      if (seen.has(c)) continue;
      seen.add(c);
      let row = cities.get(c);
      if (!row) {
        row = { name: c, total: 0, topFirms: [] };
        cities.set(c, row);
      }
      row.total++;
      let m = cityFirmCounts.get(c);
      if (!m) {
        m = new Map();
        cityFirmCounts.set(c, m);
      }
      const cur = m.get(j.firmName) || { count: 0, type: j.firmType };
      cur.count++;
      m.set(j.firmName, cur);
    }
  }
  for (const [city, m] of cityFirmCounts) {
    const top = [...m.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([firm, { count, type }]) => ({ firm: shortenFirm(firm), count, type }));
    cities.get(city).topFirms = top;
  }

  const cityRows = [...cities.values()]
    .filter((c) => c.total >= MIN_CITY_JOBS && !EXCLUDE_CITIES.has(c.name))
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_CITIES);

  const hybridByFirm = new Map();
  for (const j of validFirmJobs) {
    let r = hybridByFirm.get(j.firmName);
    if (!r) {
      r = { firm: j.firmName, type: j.firmType, total: 0, hybrid: 0 };
      hybridByFirm.set(j.firmName, r);
    }
    r.total++;
    if (j.workMode === "hybrid") r.hybrid++;
  }
  const hybridLeaders = [...hybridByFirm.values()]
    .filter((r) => r.hybrid >= 2)
    .map((r) => ({ ...r, firm: shortenFirm(r.firm), pct: (r.hybrid / r.total) * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  return { cities: cityRows, hybridLeaders, totalJobs: validFirmJobs.length };
}

function buildDashboard(cities, hybridLeaders) {
  const W = 1300;
  const left = 24;
  const panelGap = 40;
  const leftPanelW = 870;
  const rightPanelW = W - left * 2 - leftPanelW - panelGap;
  const rightPanelX = left + leftPanelW + panelGap;
  const top = 28;
  const rowH = 26;
  const barH = 14;
  const BAR_FILL = "#0f766e";

  const cityLabelW = 90;
  const cityNW = 44;
  const cityBarMaxW = 240;
  const cityFirmsX = left + cityLabelW + 8 + cityBarMaxW + 8 + cityNW + 12;
  const maxCityTotal = Math.max(...cities.map((c) => c.total), 1);

  const leftHeaders =
    `<text x="${left + cityLabelW}" y="${top - 10}" text-anchor="end" font-size="11" font-weight="600" fill="#1a1a1a">City</text>` +
    `<text x="${left + cityLabelW + 8 + cityBarMaxW + 8 + cityNW - 2}" y="${top - 10}" text-anchor="end" font-size="11" font-weight="600" fill="#1a1a1a">n</text>` +
    `<text x="${cityFirmsX}" y="${top - 10}" font-size="11" font-weight="600" fill="#1a1a1a">Top firms</text>` +
    `<line x1="${left}" y1="${top - 4}" x2="${left + leftPanelW}" y2="${top - 4}" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>`;

  const cityRows = cities
    .map((c, i) => {
      const y = top + i * rowH;
      const barW = (c.total / maxCityTotal) * cityBarMaxW;
      const barY = y + (rowH - barH) / 2;
      const labelY = y + rowH / 2 + 4;
      const cityLabel = `<text x="${left + cityLabelW}" y="${labelY}" text-anchor="end" font-size="12" font-weight="500" fill="#1a1a1a">${escapeText(c.name)}</text>`;
      const bar = `<rect x="${left + cityLabelW + 8}" y="${barY}" width="${barW}" height="${barH}" rx="2" fill="${BAR_FILL}" fill-opacity="0.78"/>`;
      const nText = `<text x="${left + cityLabelW + 8 + cityBarMaxW + 8 + cityNW - 2}" y="${labelY}" text-anchor="end" font-size="11.5" font-weight="600" fill="#1a1a1a" font-variant-numeric="tabular-nums">${c.total}</text>`;
      const firmsText = c.topFirms
        .slice(0, 4)
        .map(
          (f) =>
            `<tspan fill="#1a1a1a" font-weight="500">${escapeText(f.firm)}</tspan>&#160;<tspan fill="#6b6b6b" font-variant-numeric="tabular-nums">${f.count}</tspan>`,
        )
        .join('&#160;<tspan fill="#cdcdcd">&#183;</tspan>&#160;');
      const firms = `<text x="${cityFirmsX}" y="${labelY}" font-size="11.5" fill="#1a1a1a">${firmsText}</text>`;
      return cityLabel + bar + nText + firms;
    })
    .join("");

  const hyFirmW = 130;
  const hyBarMaxW = 130;
  const maxPct = Math.max(...hybridLeaders.map((l) => l.pct), 60);

  const rightHeaders =
    `<text x="${rightPanelX + hyFirmW}" y="${top - 10}" text-anchor="end" font-size="11" font-weight="600" fill="#1a1a1a">Firm</text>` +
    `<text x="${rightPanelX + hyFirmW + 8 + hyBarMaxW + 8}" y="${top - 10}" font-size="11" font-weight="600" fill="#1a1a1a">% tagged hybrid</text>` +
    `<line x1="${rightPanelX}" y1="${top - 4}" x2="${rightPanelX + rightPanelW}" y2="${top - 4}" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>`;

  const hyRows = hybridLeaders
    .map((l, i) => {
      const y = top + i * rowH;
      const barW = (l.pct / maxPct) * hyBarMaxW;
      const barY = y + (rowH - barH) / 2;
      const labelY = y + rowH / 2 + 4;
      const firmLabel = `<text x="${rightPanelX + hyFirmW}" y="${labelY}" text-anchor="end" font-size="12" font-weight="500" fill="#1a1a1a">${escapeText(l.firm)}</text>`;
      const bar = `<rect x="${rightPanelX + hyFirmW + 8}" y="${barY}" width="${barW}" height="${barH}" rx="2" fill="${BAR_FILL}" fill-opacity="0.78"/>`;
      const pct = `<text x="${rightPanelX + hyFirmW + 8 + barW + 6}" y="${labelY}" font-size="11.5" font-weight="600" fill="#1a1a1a" font-variant-numeric="tabular-nums">${l.pct.toFixed(0)}% <tspan fill="#6b6b6b" font-weight="500">(${l.hybrid}/${l.total})</tspan></text>`;
      return firmLabel + bar + pct;
    })
    .join("");

  const height = top + Math.max(cities.length, hybridLeaders.length) * rowH + 8;
  return { svg: leftHeaders + cityRows + rightHeaders + hyRows, height, width: W };
}

export default function LocationHeatmap({ jobs }) {
  const { cities, hybridLeaders, totalJobs, dash } = useMemo(() => {
    const agg = aggregate(jobs || []);
    return { ...agg, dash: buildDashboard(agg.cities, agg.hybridLeaders) };
  }, [jobs]);

  const numCities = cities.length;

  return (
    <div className="h-full overflow-auto bg-[#fbfbfa]">
      <div className="px-6 py-6 sm:px-10 sm:py-8 max-w-[1380px] mx-auto">
        <h1 className="text-[26px] sm:text-[30px] font-bold leading-tight tracking-tight text-[#1a1a1a] mb-1">
          Where quants hire
        </h1>
        <p className="text-[13.5px] text-[#6b6b6b] leading-snug max-w-[1100px] mb-4">
          {totalJobs.toLocaleString()} quant-relevant postings across {numCities} cities at buy-side firms (≥{MIN_FIRM_JOBS} listings, hedge funds, prop trading, and market makers). Right panel: firms that explicitly advertise hybrid in writing. Quant defaults to in-office.
        </p>
        <div className="overflow-x-auto -mx-6 sm:mx-0">
          <div
            className="px-6 sm:px-0 min-w-[1300px]"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG generated locally from trusted aggregation
            dangerouslySetInnerHTML={{
              __html: `<svg width="${dash.width}" height="${dash.height}" viewBox="0 0 ${dash.width} ${dash.height}" xmlns="http://www.w3.org/2000/svg">${dash.svg}</svg>`,
            }}
          />
        </div>

        <div className="mt-5 text-[11.5px] text-[#6b6b6b] flex justify-end">
          <span className="text-[#1a1a1a] font-semibold">quant.kadoa.com</span>
          <span className="mx-2">·</span>
          <a
            href="https://github.com/kadoa-org/quant-job-market"
            target="_blank"
            rel="noopener noreferrer"
            className="text-inherit no-underline"
          >
            github.com/kadoa-org/quant-job-market
          </a>
        </div>
      </div>
    </div>
  );
}
