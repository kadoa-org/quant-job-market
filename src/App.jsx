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
    <div className="min-h-screen sm:h-screen w-screen flex flex-col">
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
      <NavBar
        LinkComponent={({ href, children, ...rest }) => (
          <a
            href={href}
            {...rest}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey) return;
              e.preventDefault();
              const k = href.replace("#", "");
              setView(k);
              if (k === "firms") setSelectedFirm(null);
            }}
          >
            {children}
          </a>
        )}
        items={[
          { key: "firms", label: "Firms" },
          { key: "table", label: "Jobs" },
          { key: "dashboard", label: "Insights" },
          { key: "techstack", label: "Tech stack" },
          { key: "locations", label: "Locations" },
        ].map((t) => ({ href: `#${t.key}`, label: t.label, active: view === t.key }))}
      />

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

      <main className="flex-1 relative sm:overflow-hidden">
        {view === "firms" && (
          <Treemap
            firms={filteredFirms}
            colorLayer="firmType"
            onFirmClick={(f) => {
              setSelectedFirm(f);
              setView("table");
            }}
            selectedFirm={selectedFirm}
          />
        )}
        {view === "table" && <DataTable jobs={filteredJobs} search={search} onSearchChange={setSearch} />}
        {view === "dashboard" && <Dashboard jobs={filteredJobs} firms={filteredFirms} stats={stats} />}
        {view === "techstack" && <TechStackHeatmap jobs={jobs} />}
        {view === "locations" && <LocationHeatmap jobs={jobs} />}
      </main>
      <SiteFooter current="quant" />
    </div>
  );
}
