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

// Typography scale calibrated against Linear's live UI (May 2026):
//   workspace title 15.75px / 550, sidebar/section headers 13.5px / 500,
//   body content 14.6px / 500, secondary numbers 14px / 450.
// We use the same scale here so /insights and /locations match Linear's
// editorial weight without feeling cramped like our previous 9-12px.

export function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-black/[0.08] shadow-sm">
      <div className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-[12px] text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

export function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-black/[0.08] shadow-sm">
      <div className="text-[14px] text-gray-800 font-medium mb-1">{title}</div>
      {subtitle && <div className="text-[12.5px] text-gray-500 mb-3">{subtitle}</div>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}
