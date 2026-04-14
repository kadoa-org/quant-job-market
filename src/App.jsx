import React, { useCallback, useEffect, useMemo, useState } from "react";
import Dashboard from "./Dashboard";
import DataTable from "./DataTable";
import FilterBar from "./FilterBar";
import Treemap from "./Treemap";
import { useDatabase, query as dbQuery } from "./useDatabase";

const EMPTY_FILTERS = {
  firmTypes: [],
  roleCategories: [],
  locations: [],
  seniorityLevels: [],
  workModes: [],
  assetClasses: [],
};

const QUANT_ROLES = new Set([
  "quantitative_research", "quantitative_trading", "quantitative_development",
  "hft_systems", "machine_learning", "data_science", "software_engineering",
  "risk_management", "portfolio_management",
]);

// Read state from URL params
function parseUrl() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view") || "firms";
  const firm = params.get("firm") || null;
  const filters = { ...EMPTY_FILTERS };
  for (const key of Object.keys(EMPTY_FILTERS)) {
    const val = params.get(key);
    if (val) filters[key] = val.split(",");
  }
  return { view, firm, filters };
}

// Write state to URL params (replace, no history spam)
function syncUrl(view, filters, selectedFirm) {
  const params = new URLSearchParams();
  if (view !== "firms") params.set("view", view);
  if (selectedFirm) params.set("firm", selectedFirm);
  for (const [key, values] of Object.entries(filters)) {
    if (values.length > 0) params.set(key, values.join(","));
  }
  const qs = params.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
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

  // Sync state to URL on change
  useEffect(() => { syncUrl(view, filters, selectedFirm); }, [view, filters, selectedFirm]);

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
      if (filters.assetClasses.length > 0 && !j.assetClasses.some((a) => filters.assetClasses.includes(a))) return false;
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
    <div className="h-screen w-screen flex flex-col">
      <header className="h-11 flex items-center justify-between px-3 sm:px-5 border-b border-black/[0.06] bg-[#fcfcfc] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
          <span className="text-[14px] sm:text-[14.5px] font-medium text-[#191919] truncate">Quant Job Market</span>
          <span className="text-[12px] text-[#5c5c5f] hidden sm:inline">by <a href="https://kadoa.com" target="_blank" rel="noreferrer" className="hover:text-[#191919]">Kadoa</a></span>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {[
            { key: "firms", label: "Firms" },
            { key: "table", label: "Jobs" },
            { key: "dashboard", label: "Insights" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setView(key);
                if (key === "firms") setSelectedFirm(null);
              }}
              className={`px-2 sm:px-2.5 h-7 rounded-full text-[13px] sm:text-[13.5px] font-medium transition-colors ${
                view === key ? "bg-[#ededef] text-[#191919]" : "text-[#5c5c5f] hover:text-[#191919]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
            <span>{totalJobs.toLocaleString()} jobs</span>
            <span className="w-px h-3 bg-gray-200" />
            <span>{totalFirms} firms</span>
          </div>
          <a
            href="https://github.com/kadoa-org/quant-job-market"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md border border-gray-200 text-[11px] text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            <span className="hidden sm:inline">Star</span>
          </a>
        </div>
      </header>

      <FilterBar filters={filters} setFilters={setFilters} jobs={filteredJobs} allJobs={jobs} selectedFirm={selectedFirm} onClearFirm={() => setSelectedFirm(null)} onSelectFirm={setSelectedFirm} />

      <main className="flex-1 relative overflow-hidden">
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
        {view === "table" && <DataTable jobs={filteredJobs} />}
        {view === "dashboard" && <Dashboard jobs={filteredJobs} firms={filteredFirms} stats={stats} />}
      </main>

      <a
        href="https://github.com/kadoa-org/quant-job-market/issues"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-3 right-3 z-[2000] flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 text-[11px] shadow-sm hover:border-violet-300 transition-colors"
      >
        <span className="text-gray-400">Missing a firm?</span>
        <span className="text-violet-600">Open an issue or PR &rarr;</span>
      </a>
    </div>
  );
}
