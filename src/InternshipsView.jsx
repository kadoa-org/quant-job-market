import React, { useMemo } from "react";
import { rankSkillAreas } from "./skillAreas";

// Live internship view: four ranked panels over the postings classified as
// internships. Clicking a row hands off to the Jobs table with the matching
// filters applied (the site's drill-down pattern, same as StackCards' "Show the
// jobs" and the treemap's firm click) rather than filtering something offscreen.
//
// The share card built by kadoa-backend
// services/custom/datasets/jobs/scripts/buildInternshipCycle.ts renders the same
// four panels, so panel definitions must stay in sync.
const ROWS = 12;

// The locations array carries region tags alongside cities (an ad in Bala
// Cynwyd also emits "Pennsylvania"). Keep cities only so nothing counts twice.
const NON_CITY = new Set([
  "Pennsylvania",
  "Illinois",
  "Ireland",
  "Australia",
  "Virginia",
  "Brazil",
  "United Kingdom",
  "United States",
  "Netherlands",
  "France",
  "India",
  "Remote",
]);
const CITY_LABEL = { "Bala Cynwyd (Philadelphia Area)": "Philadelphia area" };

const citiesOf = (job) => (job.locations ?? []).filter((l) => l && !NON_CITY.has(l));
const shortFirm = (name) =>
  name
    .replace("Susquehanna (SIG)", "SIG")
    .replace("Five Rings Capital", "Five Rings")
    .replace("Qube RT (QRT)", "QRT")
    .replace("AQR Capital", "AQR");

export default function InternshipsView({ jobs = [], onApply }) {
  const interns = useMemo(() => jobs.filter((j) => j.seniorityLevel === "intern"), [jobs]);

  const total = interns.length;
  const firmCount = useMemo(() => new Set(interns.map((j) => j.firmName)).size, [interns]);
  const named2027 = useMemo(() => interns.filter((j) => /2027/.test(j.jobTitle)).length, [interns]);

  const byFirm = useMemo(() => {
    const counts = new Map();
    const with2027 = new Map();
    for (const job of interns) {
      counts.set(job.firmName, (counts.get(job.firmName) ?? 0) + 1);
      if (/2027/.test(job.jobTitle)) with2027.set(job.firmName, (with2027.get(job.firmName) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count, extra: with2027.get(name) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [interns]);

  const byArea = useMemo(() => rankSkillAreas(interns), [interns]);

  const byCity = useMemo(() => {
    const counts = new Map();
    for (const job of interns) for (const city of new Set(citiesOf(job))) counts.set(city, (counts.get(city) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [interns]);

  const byPay = useMemo(() => {
    const best = new Map();
    for (const job of interns) {
      if (job.salary == null) continue;
      best.set(job.firmName, Math.max(best.get(job.firmName) ?? 0, job.salary));
    }
    return [...best.entries()]
      .map(([name, salary]) => ({ name, salary }))
      .sort((a, b) => b.salary - a.salary || a.name.localeCompare(b.name));
  }, [interns]);

  // Every drill-down lands on the Jobs table filtered to internships, so the
  // count on the row is the count the table shows.
  const showJobs = (extra) => onApply?.({ firm: null, locations: [], skillAreas: [], ...extra });

  const panel = (title, rows, cols) => (
    <section className="int-panel">
      <h2>{title}</h2>
      <div className="dk-table-wrap">
        <table className="dk-table int-table">
          <thead>
            <tr>
              <th className="dk-num int-rank">#</th>
              <th>{cols.label}</th>
              <th className="dk-num">{cols.value}</th>
              {cols.extra && <th className="dk-num int-extra">{cols.extra}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, ROWS).map((row, i) => {
              const label = CITY_LABEL[row.name] ?? shortFirm(row.name);
              const go = cols.drill ? () => cols.drill(row) : undefined;
              return (
                <tr key={row.name} className={go ? "int-row" : undefined} onClick={go}>
                  <td className="dk-num int-rank">{i + 1}</td>
                  <td>
                    {go ? (
                      <button
                        type="button"
                        className="int-pickbtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          go();
                        }}
                      >
                        {label}
                      </button>
                    ) : (
                      <span className="int-plain">{label}</span>
                    )}
                  </td>
                  <td className="dk-num">{cols.format ? cols.format(row) : row.count}</td>
                  {cols.extra && <td className="dk-num int-extra">{row.extra}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > ROWS && <p className="dk-hint int-more">+{rows.length - ROWS} more</p>}
    </section>
  );

  if (!total) {
    return (
      <div className="dk-container int-wrap">
        <p className="dk-hint">Loading internships…</p>
      </div>
    );
  }

  return (
    <div className="dk-container int-wrap">
      <h1 className="int-h1">Quant internships</h1>
      <p className="int-lede">
        <strong>{total} open internships</strong> at {firmCount} firms.{" "}
        <strong>{Math.round((named2027 / total) * 100)}%</strong> are already for 2027. Click any row to open the
        postings.
      </p>

      <div className="int-grid">
        {panel("By firm", byFirm, {
          label: "Firm",
          value: "Internships",
          extra: "For 2027",
          drill: (row) => showJobs({ firm: row.name }),
        })}
        {panel("By skill area", byArea, {
          label: "Skill area",
          value: "Ads",
          drill: (row) => showJobs({ skillAreas: [row.name] }),
        })}
        {panel("By city", byCity, {
          label: "City",
          value: "Ads",
          drill: (row) => showJobs({ locations: [row.name] }),
        })}
        {panel("Highest pay", byPay, {
          label: "Firm",
          value: "Annualized base",
          format: (row) => `$${row.salary.toLocaleString("en-US")}`,
          drill: (row) => showJobs({ firm: row.name }),
        })}
      </div>

      <p className="dk-hint int-note">
        Skill areas come from the skills and tools each ad names; general-purpose languages (Python, C++, Linux, Excel)
        belong to no area. Pay is the annualized base printed in the ad, not summer take-home, and only {byPay.length}{" "}
        firms print a number.
      </p>
    </div>
  );
}
