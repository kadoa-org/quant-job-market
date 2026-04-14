import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import React, { useMemo, useRef, useState } from "react";
import { FIRM_TYPE_COLORS, FIRM_TYPE_LABELS, pctToColor, salaryToColor } from "./constants";

function getFirmColor(firm, colorLayer) {
  switch (colorLayer) {
    case "firmType":
      return FIRM_TYPE_COLORS[firm.firmType] || "#6b7280";
    case "mlAiFocusPct":
      return pctToColor(firm.mlAiFocusPct || 0);
    case "phdDemandPct":
      // Scale 0-20% to full color range (most firms are 0-10%)
      return pctToColor(Math.min(100, (firm.phdDemandPct || 0) * 5));
    case "medianSalary":
      return salaryToColor(firm.salaryStats?.median);
    case "pythonPct": {
      const pyJobs = (firm.topLanguages || []).find(([l]) => l === "Python");
      const pct = pyJobs ? (pyJobs[1] / firm.totalJobs) * 100 : 0;
      return pctToColor(pct);
    }
    case "cppPct": {
      const cppJobs = (firm.topLanguages || []).find(([l]) => l === "C++");
      const pct = cppJobs ? (cppJobs[1] / firm.totalJobs) * 100 : 0;
      return pctToColor(pct);
    }
    case "remotePct":
      // Scale 0-20% to full range
      return pctToColor(Math.min(100, (firm.remotePct || 0) * 5));
    default:
      return "#6b7280";
  }
}

function getMetricLabel(firm, colorLayer) {
  switch (colorLayer) {
    case "firmType":
      return FIRM_TYPE_LABELS[firm.firmType] || firm.firmType;
    case "mlAiFocusPct":
      return `${firm.mlAiFocusPct || 0}% AI/ML`;
    case "phdDemandPct":
      return `${firm.phdDemandPct || 0}% PhD`;
    case "medianSalary":
      return firm.salaryStats?.median ? `$${(firm.salaryStats.median / 1000).toFixed(0)}k` : "n/a";
    case "pythonPct": {
      const pyJobs = (firm.topLanguages || []).find(([l]) => l === "Python");
      const pct = pyJobs ? Math.round((pyJobs[1] / firm.totalJobs) * 100) : 0;
      return `${pct}% Python`;
    }
    case "cppPct": {
      const cppJobs = (firm.topLanguages || []).find(([l]) => l === "C++");
      const pct = cppJobs ? Math.round((cppJobs[1] / firm.totalJobs) * 100) : 0;
      return `${pct}% C++`;
    }
    case "remotePct":
      return `${firm.remotePct || 0}% remote`;
    default:
      return "";
  }
}

export default function Treemap({ firms, colorLayer, onFirmClick, selectedFirm }) {
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });
  const [dims, setDims] = useState({ w: 800, h: 600 });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tiles = useMemo(() => {
    if (firms.length === 0) return [];

    const root = hierarchy({ children: firms.map((f) => ({ ...f, value: f.totalJobs })) })
      .sum((d) => d.value || 0)
      .sort((a, b) => b.value - a.value);

    treemap().size([dims.w, dims.h]).padding(3).tile(treemapSquarify)(root);

    return root.leaves().map((leaf) => ({
      x: leaf.x0,
      y: leaf.y0,
      w: leaf.x1 - leaf.x0,
      h: leaf.y1 - leaf.y0,
      data: leaf.data,
    }));
  }, [firms, dims]);

  const hoveredFirm = hovered ? firms.find((f) => f.firmName === hovered) : null;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg width={dims.w} height={dims.h}>
        {tiles.map((tile) => {
          const isSelected = selectedFirm === tile.data.firmName;
          const isHovered = hovered === tile.data.firmName;
          const color = getFirmColor(tile.data, colorLayer);
          const showLabel = tile.w > 45 && tile.h > 25;
          const showMetric = tile.w > 80 && tile.h > 50;
          const showCount = tile.w > 60 && tile.h > 65;
          const fontSize = tile.w > 160 ? 12 : tile.w > 100 ? 11 : 9;

          // Truncate name to fit tile width (rough: ~7px per char at size 12)
          const maxChars = Math.floor(tile.w / (fontSize * 0.65));
          let displayName = tile.data.firmName;
          if (displayName.length > maxChars) {
            displayName = displayName.substring(0, maxChars - 1).trim() + "...";
          }

          return (
            <g
              key={tile.data.firmName}
              onClick={() => onFirmClick(tile.data.firmName)}
              onMouseEnter={(e) => {
                setHovered(tile.data.firmName);
                setTooltip({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <rect
                x={tile.x}
                y={tile.y}
                width={tile.w}
                height={tile.h}
                fill={color}
                opacity={isSelected || isHovered ? 0.85 : 0.7}
                stroke={isSelected ? "white" : isHovered ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)"}
                strokeWidth={isSelected ? 2 : 1}
                rx={3}
              />
              {showLabel && (
                <text
                  x={tile.x + tile.w / 2}
                  y={tile.y + tile.h / 2 - (showMetric ? 8 : 0)}
                  textAnchor="middle"
                  fill="white"
                  fontSize={fontSize}
                  fontWeight="600"
                  style={{ pointerEvents: "none" }}
                >
                  {displayName}
                </text>
              )}
              {showMetric && (
                <text
                  x={tile.x + tile.w / 2}
                  y={tile.y + tile.h / 2 + 6}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.7)"
                  fontSize={9}
                  style={{ pointerEvents: "none" }}
                >
                  {getMetricLabel(tile.data, colorLayer)}
                </text>
              )}
              {showCount && (
                <text
                  x={tile.x + tile.w / 2}
                  y={tile.y + tile.h / 2 + 18}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.4)"
                  fontSize={9}
                  style={{ pointerEvents: "none" }}
                >
                  {tile.data.totalJobs} jobs
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredFirm && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-none"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            maxWidth: 300,
          }}
        >
          <div className="font-semibold text-sm mb-0.5">{hoveredFirm.firmName}</div>
          <div className="text-[10px] text-gray-400 mb-2">{FIRM_TYPE_LABELS[hoveredFirm.firmType]} &middot; {hoveredFirm.totalJobs} open roles</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {hoveredFirm.salaryStats && (
              <>
                <span className="text-gray-500">Median salary</span>
                <span>${(hoveredFirm.salaryStats.median / 1000).toFixed(0)}k</span>
              </>
            )}
            {hoveredFirm.topLanguages?.length > 0 && (
              <>
                <span className="text-gray-500">Top tech</span>
                <span>{hoveredFirm.topLanguages.slice(0, 3).map(([l]) => l).join(", ")}</span>
              </>
            )}
            {hoveredFirm.locationDistribution?.length > 0 && (
              <>
                <span className="text-gray-500">Locations</span>
                <span>{hoveredFirm.locationDistribution.slice(0, 3).map(([l]) => l).join(", ")}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Firm type legend at bottom */}
      {colorLayer === "firmType" && (
        <div className="absolute bottom-3 left-3 hidden sm:flex flex-wrap gap-x-3 gap-y-1 bg-white/80 rounded-lg px-3 py-2 backdrop-blur-sm border border-gray-200 shadow-sm">
          {Object.entries(FIRM_TYPE_COLORS)
            .filter(([type]) => type !== "other" && type !== "consulting" && type !== "exchange")
            .map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[9px] text-gray-500">{FIRM_TYPE_LABELS[type]}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
