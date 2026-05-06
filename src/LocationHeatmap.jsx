import React, { useMemo } from "react";
import { ChartCard } from "./lib/ChartCard";
import { aggregateLocations, buildHybridLeaderboardSvg, buildLocationsLollipopSvg } from "./lib/locationCharts";

export default function LocationHeatmap({ jobs }) {
  const { agg, lollipop, hybrid } = useMemo(() => {
    const a = aggregateLocations(jobs || []);
    return {
      agg: a,
      lollipop: buildLocationsLollipopSvg(a.cities),
      hybrid: buildHybridLeaderboardSvg(a.hybridLeaders),
    };
  }, [jobs]);
  const { cities, hybridLeaders, totalJobs } = agg;
  const numCities = cities.length;

  return (
    <div className="sm:h-full sm:overflow-auto p-3 sm:p-5 bg-[#fbfbfa]">
      <div className="max-w-[1380px] mx-auto">
        <h1 className="text-[22px] sm:text-[24px] font-bold leading-tight tracking-tight text-[#191919] mb-1">
          Where quants hire
        </h1>
        <p className="text-[12px] text-gray-500 leading-snug max-w-[1100px] mb-5">
          {totalJobs.toLocaleString()} quant-relevant postings across {numCities} cities at buy-side firms (≥10
          listings, hedge funds, prop trading, market makers).
        </p>

        <div className="grid grid-cols-1 gap-4">
          <ChartCard
            title="Top quant cities"
            subtitle="Bar length is total quant postings; right column lists the four firms hiring most in each city."
          >
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div
                className="px-4 sm:px-0 min-w-[1300px]"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG generated locally from trusted aggregation
                dangerouslySetInnerHTML={{
                  __html: `<svg width="${lollipop.width}" height="${lollipop.height}" viewBox="0 0 ${lollipop.width} ${lollipop.height}" xmlns="http://www.w3.org/2000/svg">${lollipop.svg}</svg>`,
                }}
              />
            </div>
          </ChartCard>

          {hybridLeaders.length > 0 && (
            <ChartCard
              title="Hybrid-friendly firms"
              subtitle="Quant defaults to in-office. The few firms that say hybrid in writing."
            >
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div
                  className="px-4 sm:px-0 min-w-[1300px]"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG generated locally from trusted aggregation
                  dangerouslySetInnerHTML={{
                    __html: `<svg width="${hybrid.width}" height="${hybrid.height}" viewBox="0 0 ${hybrid.width} ${hybrid.height}" xmlns="http://www.w3.org/2000/svg">${hybrid.svg}</svg>`,
                  }}
                />
              </div>
            </ChartCard>
          )}
        </div>

        <div className="mt-4 text-[11px] text-gray-400 flex justify-end">
          <span className="text-gray-700 font-semibold">quant.kadoa.com</span>
          <span className="mx-2">·</span>
          <a
            href="https://github.com/kadoa-org/quant-job-market"
            target="_blank"
            rel="noopener noreferrer"
            className="text-inherit no-underline"
          >
            github.com/kadoa-org/quant-job-market
          </a>
        </div>
      </div>
    </div>
  );
}
