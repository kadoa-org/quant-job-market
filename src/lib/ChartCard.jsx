import React from "react";
import { ChartCard as KitChartCard } from "../kit";

/**
 * Dashboard chart chrome, shared by Dashboard (/insights) and LocationHeatmap (/locations). It is the kit's chart
 * card, the same grey card with a bold title and an italic description that every Kadoa dataset site uses.
 */
export function ChartCard({ title, subtitle, children }) {
  return (
    <KitChartCard title={title} description={subtitle}>
      {children}
    </KitChartCard>
  );
}
