import React, { useMemo } from "react";
import { Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  FIRM_TYPE_COLORS,
  FIRM_TYPE_LABELS,
  ROLE_COLORS,
  ROLE_LABELS,
  SENIORITY_LABELS,
  SENIORITY_ORDER,
} from "./constants";

function countBy(arr, fn) {
  const c = {};
  for (const x of arr) {
    const k = fn(x);
    c[k] = (c[k] || 0) + 1;
  }
  return c;
}

function countArrayItems(arr, fn) {
  const c = {};
  for (const x of arr) for (const v of fn(x)) c[v] = (c[v] || 0) + 1;
  return c;
}

function toSorted(obj, limit = 20) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }));
}

function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const tooltipStyle = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 11,
  color: "#374151",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
};

function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-black/[0.08] shadow-sm">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-[10px] text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-black/[0.08] shadow-sm">
      <div className="text-xs text-gray-500 font-medium mb-0.5">{title}</div>
      {subtitle && <div className="text-[9px] text-gray-400 mb-3">{subtitle}</div>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

export default function Dashboard({ jobs, firms }) {
  // --- Tech stack by firm type ---
  const techByFirmType = useMemo(() => {
    const types = ["proprietary", "hedge_fund", "market_maker", "bank", "asset_manager"];
    const langs = ["Python", "C++", "Java", "Rust", "R", "SQL", "KDB+/Q"];
    return langs.map((lang) => {
      const row = { name: lang };
      for (const type of types) {
        const firmJobs = jobs.filter((j) => j.firmType === type);
        const withLang = firmJobs.filter((j) => j.programmingLanguages.includes(lang));
        row[type] = firmJobs.length > 0 ? Math.round((withLang.length / firmJobs.length) * 100) : 0;
      }
      return row;
    });
  }, [jobs]);

  // --- PhD demand by firm (top 10) ---
  const phdByFirm = useMemo(() => {
    return firms
      .filter((f) => f.totalJobs >= 15)
      .map((f) => ({
        name: f.firmName,
        phdPct: f.phdDemandPct || 0,
        firmType: f.firmType,
      }))
      .sort((a, b) => b.phdPct - a.phdPct)
      .slice(0, 10);
  }, [firms]);

  // --- Role distribution ---
  const roleData = useMemo(() => {
    const counts = countBy(jobs, (j) => j.roleCategory);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: ROLE_LABELS[name] || name, value, key: name }));
  }, [jobs]);

  // --- Seniority ---
  const seniorityData = useMemo(() => {
    const counts = countBy(jobs, (j) => j.seniorityLevel);
    return SENIORITY_ORDER.filter((s) => counts[s]).map((s) => ({ name: SENIORITY_LABELS[s], value: counts[s] }));
  }, [jobs]);

  // --- Top locations ---
  const locationData = useMemo(
    () =>
      toSorted(
        countArrayItems(jobs, (j) => j.locations),
        12,
      ),
    [jobs],
  );

  // --- Programming languages overall ---
  const languageData = useMemo(
    () =>
      toSorted(
        countArrayItems(jobs, (j) => j.programmingLanguages),
        12,
      ),
    [jobs],
  );

  // --- Technologies ---
  const techData = useMemo(() => toSorted(countArrayItems(jobs, (j) => j.technologies), 12), [jobs]);

  // --- Education ---
  const educationData = useMemo(() => {
    const counts = countBy(jobs, (j) => j.educationRequirement);
    const labels = {
      not_specified: "Not Specified",
      bachelors: "Bachelors",
      masters: "Masters",
      phd_preferred: "PhD Preferred",
      phd_required: "PhD Required",
    };
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: labels[name] || name, value }));
  }, [jobs]);

  // --- Asset classes ---
  const assetClassData = useMemo(
    () =>
      toSorted(
        countArrayItems(jobs, (j) => j.assetClasses),
        10,
      ),
    [jobs],
  );

  // --- Stats ---
  const salaries = jobs.filter((j) => j.salary).map((j) => j.salary);
  const medianSalary = salaries.length > 0 ? median(salaries) : null;
  const pythonJobs = jobs.filter((j) => j.programmingLanguages?.includes("Python")).length;
  const cppJobs = jobs.filter((j) => j.programmingLanguages?.includes("C++")).length;
  const phdPct =
    jobs.length > 0
      ? Math.round(
          (jobs.filter((j) => j.educationRequirement === "phd_required" || j.educationRequirement === "phd_preferred")
            .length /
            jobs.length) *
            100,
        )
      : 0;

  const COLORS = ["#8b5cf6", "#3b82f6", "#06b6d4", "#10b981", "#eab308", "#f97316", "#ef4444", "#ec4899", "#6b7280"];
  const firmTypeColors = ["#f97316", "#8b5cf6", "#06b6d4", "#3b82f6", "#10b981"];
  const firmTypeLabels = {
    proprietary: "Prop",
    hedge_fund: "HF",
    market_maker: "MM",
    bank: "Bank",
    asset_manager: "AM",
  };

  return (
    <div className="h-full overflow-auto p-5">
      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <StatCard title="Quant Jobs" value={jobs.length.toLocaleString()} subtitle={`${firms.length} firms`} />
        <StatCard
          title="Median Salary"
          value={medianSalary ? `$${(medianSalary / 1000).toFixed(0)}k` : "n/a"}
          subtitle={`${salaries.length} disclosed`}
        />
        <StatCard title="PhD Demand" value={`${phdPct}%`} subtitle="required or preferred" />
        <StatCard
          title="Top Location"
          value={locationData[0]?.name || "n/a"}
          subtitle={`${locationData[0]?.value || 0} jobs`}
        />
        <StatCard title="Top Role" value={roleData[0]?.name || "n/a"} subtitle={`${roleData[0]?.value || 0} jobs`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Tech stack by firm type - THE key chart for r/quant */}
        <ChartCard title="Tech Stack by Firm Type" subtitle="% of jobs mentioning each language, grouped by firm type">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={techByFirmType} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 45 }}>
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
              <Legend formatter={(v) => firmTypeLabels[v] || v} wrapperStyle={{ fontSize: 10 }} />
              {["proprietary", "hedge_fund", "market_maker", "bank", "asset_manager"].map((type, i) => (
                <Bar key={type} dataKey={type} fill={firmTypeColors[i]} radius={[0, 2, 2, 0]} barSize={6} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Programming Languages */}
        <ChartCard title="Programming Languages" subtitle="Number of job postings mentioning each language">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={languageData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 75 }}>
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} width={70} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 3, 3, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Role Categories */}
        <ChartCard title="Role Categories" subtitle="Distribution of quant-relevant job types">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={roleData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 80 }}>
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} width={75} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={18}>
                {roleData.map((entry, i) => (
                  <Cell key={entry.name} fill={ROLE_COLORS[entry.key] || COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Locations */}
        <ChartCard title="Top Locations" subtitle="Cities with most quant job postings">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={locationData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 70 }}>
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} width={65} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#06b6d4" radius={[0, 3, 3, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Education Requirements */}
        <ChartCard title="Education Requirements" subtitle="Minimum education level mentioned in job postings">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={educationData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 90 }}>
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} width={85} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 3, 3, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Seniority Distribution */}
        <ChartCard title="Seniority Distribution">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={seniorityData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 70 }}>
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} width={65} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#10b981" radius={[0, 3, 3, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Asset Classes */}
        <ChartCard title="Asset Classes" subtitle="Most mentioned asset classes across all postings">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={assetClassData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 80 }}>
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} width={75} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#f97316" radius={[0, 3, 3, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Technologies */}
        <ChartCard title="Technologies & Tools" subtitle="Frameworks, platforms, and tools mentioned in postings">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={techData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 80 }}>
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} width={75} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#10b981" radius={[0, 3, 3, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
