import React, { useMemo } from "react";
import { FIRM_TYPE_LABELS, ROLE_LABELS, SENIORITY_LABELS, SENIORITY_ORDER } from "./constants";

function FilterSection({ title, options, selected, onChange }) {
  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{title}</span>
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="text-[9px] text-violet-400 hover:text-violet-300">
            clear
          </button>
        )}
      </div>
      <div className="space-y-0.5">
        {options.map(({ value, label, count }) => (
          <button
            key={value}
            onClick={() => toggle(value)}
            className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] transition-colors ${
              selected.includes(value)
                ? "bg-violet-500/15 text-violet-300"
                : "text-white/50 hover:bg-white/[0.03] hover:text-white/70"
            }`}
          >
            <span className="truncate">{label}</span>
            <span className="text-[9px] text-white/25 ml-2">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ filters, setFilters, firms, stats, jobs }) {
  const firmTypeOptions = useMemo(() => {
    const counts = {};
    for (const j of jobs) {
      counts[j.firmType] = (counts[j.firmType] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        value: type,
        label: FIRM_TYPE_LABELS[type] || type,
        count,
      }));
  }, [jobs]);

  const roleOptions = useMemo(() => {
    const counts = {};
    for (const j of jobs) {
      counts[j.roleCategory] = (counts[j.roleCategory] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => ({
        value: role,
        label: ROLE_LABELS[role] || role,
        count,
      }));
  }, [jobs]);

  const seniorityOptions = useMemo(() => {
    const counts = {};
    for (const j of jobs) {
      counts[j.seniorityLevel] = (counts[j.seniorityLevel] || 0) + 1;
    }
    return SENIORITY_ORDER.filter((s) => counts[s]).map((s) => ({
      value: s,
      label: SENIORITY_LABELS[s],
      count: counts[s],
    }));
  }, [jobs]);

  const locationOptions = useMemo(() => {
    const counts = {};
    for (const j of jobs) {
      for (const loc of j.locations) {
        counts[loc] = (counts[loc] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([loc, count]) => ({ value: loc, label: loc, count }));
  }, [jobs]);

  const workModeOptions = useMemo(() => {
    const counts = {};
    for (const j of jobs) {
      counts[j.workMode] = (counts[j.workMode] || 0) + 1;
    }
    const labels = { onsite: "Onsite", hybrid: "Hybrid", remote: "Remote", not_specified: "Not Specified" };
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([mode, count]) => ({ value: mode, label: labels[mode] || mode, count }));
  }, [jobs]);

  const assetClassOptions = useMemo(() => {
    const counts = {};
    for (const j of jobs) {
      for (const ac of j.assetClasses || []) {
        counts[ac] = (counts[ac] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([ac, count]) => ({ value: ac, label: ac, count }));
  }, [jobs]);

  const updateFilter = (key) => (values) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
  };

  const activeFilterCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <aside className="w-52 border-r border-white/5 overflow-y-auto p-3 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-white/60">Filters</span>
        {activeFilterCount > 0 && (
          <button
            onClick={() =>
              setFilters({
                firmTypes: [],
                roleCategories: [],
                locations: [],
                seniorityLevels: [],
                workModes: [],
                assetClasses: [],
              })
            }
            className="text-[9px] text-violet-400 hover:text-violet-300"
          >
            clear all ({activeFilterCount})
          </button>
        )}
      </div>

      <FilterSection
        title="Firm Type"
        options={firmTypeOptions}
        selected={filters.firmTypes}
        onChange={updateFilter("firmTypes")}
      />

      <FilterSection
        title="Role"
        options={roleOptions}
        selected={filters.roleCategories}
        onChange={updateFilter("roleCategories")}
      />

      <FilterSection
        title="Seniority"
        options={seniorityOptions}
        selected={filters.seniorityLevels}
        onChange={updateFilter("seniorityLevels")}
      />

      <FilterSection
        title="Location"
        options={locationOptions}
        selected={filters.locations}
        onChange={updateFilter("locations")}
      />

      <FilterSection
        title="Work Mode"
        options={workModeOptions}
        selected={filters.workModes}
        onChange={updateFilter("workModes")}
      />

      {assetClassOptions.length > 0 && (
        <FilterSection
          title="Asset Class"
          options={assetClassOptions}
          selected={filters.assetClasses}
          onChange={updateFilter("assetClasses")}
        />
      )}
    </aside>
  );
}
