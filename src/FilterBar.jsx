import React, { useMemo, useState, useRef, useEffect } from "react";
import { FIRM_TYPE_LABELS, ROLE_LABELS, SENIORITY_LABELS, SENIORITY_ORDER } from "./constants";

function FilterDropdown({ options, selected, onChange, onClose, singleSelect }) {
  const ref = useRef(null);
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-[200] bg-white border border-[#e0e0e0] rounded-lg shadow-lg min-w-[180px] sm:min-w-[220px] max-h-[60vh] sm:max-h-[340px] flex flex-col overflow-hidden">
      {options.length > 6 && (
        <div className="px-2 py-1.5 border-b border-[#f0f0f0]">
          <input
            ref={inputRef}
            type="text"
            placeholder="Filter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[13px] text-[#191919] placeholder:text-[#b0b0b0] outline-none bg-transparent"
          />
        </div>
      )}
      <div className="overflow-y-auto py-1">
        {filtered.map(({ value, label, count }) => {
          const isSelected = selected.includes(value);
          return (
            <button
              key={value}
              onClick={() => {
                if (singleSelect) {
                  onChange(isSelected ? [] : [value]);
                } else {
                  onChange(isSelected ? selected.filter((v) => v !== value) : [...selected, value]);
                }
              }}
              className="w-full flex items-center justify-between px-3 h-[30px] text-[13px] transition-colors hover:bg-[#f5f5f5]"
            >
              <div className="flex items-center gap-2">
                {!singleSelect && (
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                    isSelected ? "bg-[#5e6ad2] border-[#5e6ad2]" : "border-[#d4d4d4]"
                  }`}>
                    {isSelected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5"><path d="M1.5 4L3 5.5L6.5 2"/></svg>}
                  </div>
                )}
                <span className={isSelected ? "text-[#191919] font-medium" : "text-[#191919]"}>{label}</span>
              </div>
              <span className="text-[12px] text-[#b0b0b0] ml-4">{count}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-[12px] text-[#b0b0b0]">No results</div>
        )}
      </div>
    </div>
  );
}

export default function FilterBar({ filters, setFilters, jobs, selectedFirm, onClearFirm, onSelectFirm, allJobs }) {
  const [openFilter, setOpenFilter] = useState(null);

  const toggle = (key) => setOpenFilter(openFilter === key ? null : key);
  const updateFilter = (key) => (values) => setFilters((prev) => ({ ...prev, [key]: values }));

  const firmOptions = useMemo(() => {
    const source = allJobs || jobs;
    const counts = {};
    for (const j of source) counts[j.firmName] = (counts[j.firmName] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ value: name, label: name, count }));
  }, [allJobs, jobs]);

  const firmTypeOptions = useMemo(() => {
    const counts = {};
    for (const j of jobs) counts[j.firmType] = (counts[j.firmType] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ value: type, label: FIRM_TYPE_LABELS[type] || type, count }));
  }, [jobs]);

  const roleOptions = useMemo(() => {
    const counts = {};
    for (const j of jobs) counts[j.roleCategory] = (counts[j.roleCategory] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => ({ value: role, label: ROLE_LABELS[role] || role, count }));
  }, [jobs]);

  const seniorityOptions = useMemo(() => {
    const counts = {};
    for (const j of jobs) counts[j.seniorityLevel] = (counts[j.seniorityLevel] || 0) + 1;
    return SENIORITY_ORDER
      .filter((s) => counts[s])
      .map((s) => ({ value: s, label: SENIORITY_LABELS[s], count: counts[s] }));
  }, [jobs]);

  const locationOptions = useMemo(() => {
    const counts = {};
    for (const j of jobs) for (const loc of j.locations) counts[loc] = (counts[loc] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([loc, count]) => ({ value: loc, label: loc, count }));
  }, [jobs]);

  const assetClassOptions = useMemo(() => {
    const counts = {};
    for (const j of jobs) for (const ac of j.assetClasses || []) counts[ac] = (counts[ac] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([ac, count]) => ({ value: ac, label: ac, count }));
  }, [jobs]);

  const activeCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0) + (selectedFirm ? 1 : 0);

  const filterConfigs = [
    { key: "firmTypes", label: "Firm Type", options: firmTypeOptions },
    { key: "roleCategories", label: "Role", options: roleOptions },
    { key: "seniorityLevels", label: "Seniority", options: seniorityOptions },
    { key: "locations", label: "Location", options: locationOptions },
    { key: "assetClasses", label: "Asset Class", options: assetClassOptions },
  ];

  const chipClass = (active) => `flex items-center gap-1 h-[22px] rounded-[7.5px] text-[12px] sm:text-[13.5px] font-normal bg-white border transition-colors whitespace-nowrap ${
    active ? "border-[#d4d4d4] text-[#191919]" : "border-[#d4d4d4] text-[#5c5c5f] hover:text-[#191919] hover:border-[#b0b0b0]"
  }`;

  const closeIcon = <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>;

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-[5px] border-b border-black/[0.04] bg-[#fcfcfc] relative z-[100]">
      {/* Firm single-select */}
      <div className="relative">
        <button onClick={() => toggle("firm")} className={chipClass(!!selectedFirm)}>
          <span className="px-[6px]">{selectedFirm || "Firm"}</span>
          {selectedFirm && (
            <span className="border-l border-[#d4d4d4] px-[5px] text-[#9c9ca0] hover:text-[#191919] cursor-pointer flex items-center"
              onClick={(e) => { e.stopPropagation(); onClearFirm(); }}>{closeIcon}</span>
          )}
        </button>
        {openFilter === "firm" && (
          <FilterDropdown
            options={firmOptions}
            selected={selectedFirm ? [selectedFirm] : []}
            singleSelect
            onChange={(values) => {
              const newFirm = values.length > 0 ? values[0] : null;
              if (onSelectFirm) onSelectFirm(newFirm);
              setOpenFilter(null);
            }}
            onClose={() => setOpenFilter(null)}
          />
        )}
      </div>

      {/* Multi-select filters */}
      {filterConfigs.map(({ key, label, options }) => (
        <div key={key} className="relative">
          <button onClick={() => toggle(key)} className={chipClass(filters[key].length > 0)}>
            <span className="px-[6px]">{label}</span>
            {filters[key].length > 0 && (
              <>
                <span className="border-l border-[#d4d4d4] px-[6px] text-[#5c5c5f]">{filters[key].length}</span>
                <span className="border-l border-[#d4d4d4] px-[5px] text-[#9c9ca0] hover:text-[#191919] cursor-pointer flex items-center"
                  onClick={(e) => { e.stopPropagation(); updateFilter(key)([]); }}>{closeIcon}</span>
              </>
            )}
          </button>
          {openFilter === key && (
            <FilterDropdown
              options={options}
              selected={filters[key]}
              onChange={updateFilter(key)}
              onClose={() => setOpenFilter(null)}
            />
          )}
        </div>
      ))}

      {activeCount > 0 && (
        <button
          onClick={() => {
            setFilters({ firmTypes: [], roleCategories: [], locations: [], seniorityLevels: [], workModes: [], assetClasses: [] });
            if (onClearFirm) onClearFirm();
          }}
          className="text-[12px] text-[#9c9ca0] hover:text-[#191919] ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
