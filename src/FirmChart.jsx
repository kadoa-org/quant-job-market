import React, { useMemo, useState } from "react";
import { FIRM_TYPE_COLORS, FIRM_TYPE_LABELS, ROLE_LABELS } from "./constants";

function MetricBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex-1">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function getMetricValue(firm, colorLayer) {
  switch (colorLayer) {
    case "firmType":
      return null;
    case "mlAiFocusPct":
      return firm.mlAiFocusPct || 0;
    case "phdDemandPct":
      return firm.phdDemandPct || 0;
    case "medianSalary":
      return firm.salaryStats?.median || 0;
    case "pythonPct": {
      const py = (firm.topLanguages || []).find(([l]) => l === "Python");
      return py ? Math.round((py[1] / firm.totalJobs) * 100) : 0;
    }
    case "cppPct": {
      const cpp = (firm.topLanguages || []).find(([l]) => l === "C++");
      return cpp ? Math.round((cpp[1] / firm.totalJobs) * 100) : 0;
    }
    case "remotePct":
      return firm.remotePct || 0;
    default:
      return null;
  }
}

function getMetricLabel(value, colorLayer) {
  if (value === null) return "";
  switch (colorLayer) {
    case "medianSalary":
      return value > 0 ? `$${(value / 1000).toFixed(0)}k` : "-";
    default:
      return `${value}%`;
  }
}

export default function FirmChart({ firms, colorLayer, onFirmClick, selectedFirm }) {
  const [hoveredFirm, setHoveredFirm] = useState(null);

  const maxJobs = useMemo(() => Math.max(...firms.map((f) => f.totalJobs), 1), [firms]);
  const maxMetric = useMemo(() => {
    if (colorLayer === "firmType") return 0;
    return Math.max(...firms.map((f) => getMetricValue(f, colorLayer) || 0), 1);
  }, [firms, colorLayer]);

  const showMetric = colorLayer !== "firmType";

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <div className="space-y-1">
        {firms.map((firm) => {
          const isSelected = selectedFirm === firm.firmName;
          const isHovered = hoveredFirm === firm.firmName;
          const metricValue = getMetricValue(firm, colorLayer);
          const firmColor = FIRM_TYPE_COLORS[firm.firmType] || "#6b7280";
          const barPct = (firm.totalJobs / maxJobs) * 100;

          return (
            <div
              key={firm.firmName}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? "bg-violet-500/10 ring-1 ring-violet-500/30"
                  : isHovered
                    ? "bg-white/[0.04]"
                    : "hover:bg-white/[0.03]"
              }`}
              onClick={() => onFirmClick(firm.firmName)}
              onMouseEnter={() => setHoveredFirm(firm.firmName)}
              onMouseLeave={() => setHoveredFirm(null)}
            >
              {/* Firm type dot */}
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: firmColor }} />

              {/* Firm name */}
              <div className="w-40 flex-shrink-0">
                <div className="text-xs font-medium text-white/80 truncate">{firm.firmName}</div>
                <div className="text-[9px] text-white/30">{FIRM_TYPE_LABELS[firm.firmType]}</div>
              </div>

              {/* Job count bar */}
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-5 bg-white/[0.03] rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: firmColor,
                      opacity: isSelected || isHovered ? 0.8 : 0.5,
                    }}
                  />
                  {/* Top roles inside the bar */}
                  {barPct > 20 && (
                    <div className="absolute inset-0 flex items-center px-2 gap-1.5">
                      {Object.entries(firm.jobsByRole || {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([role, count]) => (
                          <span key={role} className="text-[8px] text-white/50">
                            {ROLE_LABELS[role]?.split(" ")[0] || role} {count}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <span className="text-xs font-mono text-white/50 w-10 text-right flex-shrink-0">{firm.totalJobs}</span>
              </div>

              {/* Quick stats on hover */}
              {(isHovered || isSelected) && (
                <div className="flex gap-3 text-[9px] text-white/30 flex-shrink-0">
                  {firm.topLanguages?.slice(0, 3).map(([lang]) => (
                    <span key={lang} className="bg-white/5 px-1.5 py-0.5 rounded">
                      {lang}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
