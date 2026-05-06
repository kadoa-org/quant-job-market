import React from "react";

/**
 * Shared dashboard chrome.
 *
 *   <StatCard title="..." value="..." subtitle="..." />
 *   <ChartCard title="..." subtitle="...">{children}</ChartCard>
 *
 * Used by Dashboard (/insights), LocationHeatmap (/locations), and any
 * other view that wants the same card visual identity. Edit here once;
 * every page picks it up.
 */

export function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-black/[0.08] shadow-sm">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-[10px] text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

export function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-black/[0.08] shadow-sm">
      <div className="text-xs text-gray-500 font-medium mb-0.5">{title}</div>
      {subtitle && <div className="text-[9px] text-gray-400 mb-3">{subtitle}</div>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}
