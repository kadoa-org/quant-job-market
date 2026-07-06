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
    <div className="bg-white  p-4 border border-[#b1b4b6] ">
      <div className="dk-stat-label">{title}</div>
      <div className="dk-stat-value">{value}</div>
      {subtitle && <div className="dk-stat-sub">{subtitle}</div>}
    </div>
  );
}

export function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white  p-4 border border-[#b1b4b6] ">
      <div style={{ font: "700 17px/1.3 Inter, sans-serif", color: "#0b0c0c", marginBottom: 2 }}>{title}</div>
      {subtitle && <div className="dk-hint" style={{ marginBottom: 10 }}>{subtitle}</div>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}
