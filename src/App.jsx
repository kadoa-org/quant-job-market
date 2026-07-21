import React, { useCallback, useEffect, useMemo, useState } from "react";
import Dashboard from "./Dashboard";
import DataTable from "./DataTable";
import FilterBar from "./FilterBar";
import { Button, GitHubButton, LiveBadge, NavBar, SiteFooter, SiteHeader } from "./kit";
import LocationHeatmap from "./LocationHeatmap";
import TechStackHeatmap from "./TechStackHeatmap";
import Treemap from "./Treemap";
import { query as dbQuery, useDatabase } from "./useDatabase";

const EMPTY_FILTERS = {
  firmTypes: [],
  roleCategories: [],
  locations: [],
  seniorityLevels: [],
  workModes: [],
  assetClasses: [],
};

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

// /tech-stack and /locations are pre-rendered HTML pages with custom OG/SEO.
// All other views live under / and use ?view=... so a single HTML carries them.
// /heatmap is kept as a legacy alias for already-shared links.
// All paths are relative to the deploy prefix (import.meta.env.BASE_URL,
// "/quant/" in production, "/" in dev).
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

function viewFromPath() {
  const p = window.location.pathname.replace(/\/$/, "");
  if (p === `${BASE_PATH}/tech-stack` || p === `${BASE_PATH}/heatmap`) return "techstack";
  if (p === `${BASE_PATH}/locations`) return "locations";
  return null;
}

function pathForView(view) {
  if (view === "techstack") return `${BASE_PATH}/tech-stack`;
  if (view === "locations") return `${BASE_PATH}/locations`;
  return `${BASE_PATH}/`;
}

// Read state from URL (path picks tech-stack/locations, then ?view=... for the rest)
function parseUrl() {
  const params = new URLSearchParams(window.location.search);
  // Accept legacy "heatmap" view name from old shared URLs
  const queryView = params.get("view") === "heatmap" ? "techstack" : params.get("view");
  const view = viewFromPath() || queryView || "firms";
  const firm = params.get("firm") || null;
  const filters = { ...EMPTY_FILTERS };
  for (const key of Object.keys(EMPTY_FILTERS)) {
    const val = params.get(key);
    if (val) filters[key] = val.split(",");
  }
  const search = params.get("q") || "";
  return { view, firm, filters, search };
}

// Write state to URL params (replace, no history spam)
function syncUrl(view, filters, selectedFirm, search) {
  const params = new URLSearchParams();
  // /tech-stack and /locations carry their own view; do not duplicate as ?view=
  if (view !== "firms" && view !== "techstack" && view !== "locations") params.set("view", view);
  if (selectedFirm) params.set("firm", selectedFirm);
  for (const [key, values] of Object.entries(filters)) {
    if (values.length > 0) params.set(key, values.join(","));
  }
  if (search) params.set("q", search);
  const qs = params.toString();
  const path = pathForView(view);
  const url = qs ? `${path}?${qs}` : path;
  window.history.replaceState(null, "", url);
}

// Top nav: Firms | Jobs | Insights ▾. The secondary analytics views (dashboard,
// tech stack, locations, open source) collapse under one Insights menu — they
// are interesting, not primary. Reuses the kit's dk-nav look; the dropdown is
// local to this app.
function InsightsNav({ view, setView, onFirms }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const insightsActive = ["dashboard", "techstack", "locations"].includes(view);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const go = (k) => {
    setView(k);
    setOpen(false);
    if (k === "firms") onFirms();
  };
  const tab = (k, label) => (
    <a
      href={`#${k}`}
      aria-current={view === k ? "true" : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        go(k);
      }}
    >
      {label}
    </a>
  );
  const item = (k, label) => (
    <a
      href={`#${k}`}
      className="px-4 py-2 text-[14px] text-[#1a1a1a] hover:bg-[#f3f2f1] no-underline"
      style={{ display: "block", fontWeight: view === k ? 600 : 400 }}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        go(k);
      }}
    >
      {label}
    </a>
  );

  return (
    <nav className="dk-nav" aria-label="Primary">
      <div className="dk-container">
        <ul className="dk-nav-list">
          <li>{tab("firms", "Firms")}</li>
          <li>{tab("table", "Jobs")}</li>
          <li className="relative" ref={ref}>
            <a
              href="#insights"
              aria-current={insightsActive ? "true" : undefined}
              aria-expanded={open}
              aria-haspopup="true"
              onClick={(e) => {
                e.preventDefault();
                setOpen((v) => !v);
              }}
            >
              Insights <span aria-hidden="true" style={{ fontSize: 10, verticalAlign: 1 }}>▾</span>
            </a>
            {open && (
              <div className="absolute left-0 top-full z-[1100] mt-px min-w-[180px] bg-white border border-[#b1b4b6] shadow-[0_4px_14px_rgba(17,17,17,0.12)]">
                {item("dashboard", "Hiring insights")}
                {item("techstack", "Tech stack")}
                {item("locations", "Locations")}
                <a
                  href={`${import.meta.env.BASE_URL}open-source`}
                  className="px-4 py-2 text-[14px] text-[#1a1a1a] hover:bg-[#f3f2f1] no-underline border-t border-[#eeedec]"
                  style={{ display: "block" }}
                >
                  Open source
                </a>
              </div>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default function App() {
  const { db, loading: dbLoading } = useDatabase();
  const [jobs, setJobs] = useState([]);
  const [firms, setFirms] = useState([]);
  const [stats, setStats] = useState(null);

  // Init from URL
  const initial = useMemo(() => parseUrl(), []);
  const [view, setView] = useState(initial.view);
  const [filters, setFilters] = useState(initial.filters);
  const [selectedFirm, setSelectedFirm] = useState(initial.firm);
  const [search, setSearch] = useState(initial.search);

  // Sync state to URL on change
  useEffect(() => {
    syncUrl(view, filters, selectedFirm, search);
  }, [view, filters, selectedFirm, search]);

  // The prerendered shells carry crawler-only content after #root (h1 + firm
  // table + link footer, class "seo-shell") so the head-term pages aren't
  // empty for search engines. Once the app is mounted the interactive views
  // replace it — drop it so it doesn't render below the app.
  useEffect(() => {
    for (const el of document.querySelectorAll(".seo-shell")) el.remove();
  }, []);

  // Load data from SQLite
  useEffect(() => {
    if (!db) return;

    const rawJobs = dbQuery(db, "SELECT * FROM jobs").map((r) => ({
      ...r,
      firmName: r.firm_name,
      firmSlug: r.firm_slug,
      firmType: r.firm_type,
      jobTitle: r.job_title,
      datePosted: r.date_posted,
      applyUrl: r.apply_url,
      locations: r.locations ? JSON.parse(r.locations) : [],
      jobType: r.job_type,
      roleCategory: r.role_category,
      seniorityLevel: r.seniority_level,
      educationRequirement: r.education_requirement,
      experienceYears: { min: r.experience_min, max: r.experience_max },
      programmingLanguages: r.programming_languages ? JSON.parse(r.programming_languages) : [],
      technologies: r.technologies ? JSON.parse(r.technologies) : [],
      skills: r.skills ? JSON.parse(r.skills) : [],
      assetClasses: r.asset_classes ? JSON.parse(r.asset_classes) : [],
      workMode: r.work_mode,
    }));

    const rawFirms = dbQuery(db, "SELECT * FROM firms").map((r) => ({
      firmName: r.firm_name,
      firmSlug: r.firm_slug,
      firmType: r.firm_type,
      totalJobs: r.total_jobs,
      phdDemandPct: r.phd_demand_pct,
      mlAiFocusPct: r.ml_ai_focus_pct,
      remotePct: r.remote_pct,
      salaryStats: r.salary_median ? { median: r.salary_median, avg: r.salary_avg, count: r.salary_count } : null,
      topLanguages: r.top_languages ? JSON.parse(r.top_languages) : [],
      topSkills: r.top_skills ? JSON.parse(r.top_skills) : [],
      locationDistribution: r.location_distribution ? JSON.parse(r.location_distribution) : [],
      jobsByRole: r.jobs_by_role ? JSON.parse(r.jobs_by_role) : {},
      jobsBySeniority: r.jobs_by_seniority ? JSON.parse(r.jobs_by_seniority) : {},
    }));

    setJobs(rawJobs.filter((job) => QUANT_ROLES.has(job.roleCategory)));
    setFirms(rawFirms);
    setStats({}); // stats computed from jobs in Dashboard
  }, [db]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (filters.firmTypes.length > 0 && !filters.firmTypes.includes(j.firmType)) return false;
      if (filters.roleCategories.length > 0 && !filters.roleCategories.includes(j.roleCategory)) return false;
      if (filters.seniorityLevels.length > 0 && !filters.seniorityLevels.includes(j.seniorityLevel)) return false;
      if (filters.workModes.length > 0 && !filters.workModes.includes(j.workMode)) return false;
      if (filters.locations.length > 0 && !j.locations.some((l) => filters.locations.includes(l))) return false;
      if (filters.assetClasses.length > 0 && !j.assetClasses.some((a) => filters.assetClasses.includes(a)))
        return false;
      if (selectedFirm && j.firmName !== selectedFirm) return false;
      return true;
    });
  }, [jobs, filters, selectedFirm]);

  const filteredFirms = useMemo(() => {
    const firmMap = new Map();
    for (const j of filteredJobs) {
      if (!firmMap.has(j.firmName)) {
        const firm = firms.find((f) => f.firmName === j.firmName);
        if (firm) firmMap.set(j.firmName, { ...firm, totalJobs: 0 });
      }
      const f = firmMap.get(j.firmName);
      if (f) f.totalJobs++;
    }
    return [...firmMap.values()].sort((a, b) => b.totalJobs - a.totalJobs);
  }, [firms, filteredJobs]);

  const totalJobs = filteredJobs.length;
  const totalFirms = filteredFirms.length;

  return (
    // The app locks to the viewport on desktop (inner views scroll themselves);
    // the SiteFooter sits OUTSIDE the locked container so it lives below the
    // fold like on the sibling microsites, instead of being pinned on screen.
    <>
      <div className="min-h-screen sm:min-h-dvh w-full flex flex-col">
        <SiteHeader
          brand="📊 Quant Job Market"
          LinkComponent={(p) => <a {...p} />}
          brandSuffix={
            <a href="https://www.kadoa.com" target="_blank" rel="noreferrer" className="dk-header-link">
              by Kadoa
            </a>
          }
          right={
            <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <LiveBadge>Updated daily</LiveBadge>
              <GitHubButton repo="kadoa-org/quant-job-market" />
            </span>
          }
        />
        <InsightsNav view={view} setView={setView} onFirms={() => setSelectedFirm(null)} />

        {view !== "techstack" && view !== "locations" && (
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            jobs={filteredJobs}
            allJobs={jobs}
            selectedFirm={selectedFirm}
            onClearFirm={() => setSelectedFirm(null)}
            onSelectFirm={setSelectedFirm}
          />
        )}

        <main className="flex-1 relative">
          {view === "firms" && (
            // Desktop: fill the leftover viewport space (main is flex-1 of a
            // min-h-dvh column) so the treemap fits one screen; the document
            // stays the only scroller. Mobile: normal flow (card list).
            <div className="sm:absolute sm:inset-0">
              <Treemap
                firms={filteredFirms}
                colorLayer="firmType"
                onFirmClick={(f) => {
                  setSelectedFirm(f);
                  setView("table");
                }}
                selectedFirm={selectedFirm}
              />
            </div>
          )}
          {view === "table" && <DataTable jobs={filteredJobs} search={search} onSearchChange={setSearch} />}
          {view === "dashboard" && <Dashboard jobs={filteredJobs} firms={filteredFirms} stats={stats} />}
          {view === "techstack" && <TechStackHeatmap jobs={jobs} />}
          {view === "locations" && <LocationHeatmap jobs={jobs} />}
        </main>
      </div>
      <SiteFooter current="quant" />
    </>
  );
}
