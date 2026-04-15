/**
 * Build SQLite database for client-side use from jobs.json.
 * Computes firm aggregates and builds both tables.
 * Run: node scripts/build-db.js
 */

import initSqlJs from "sql.js";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "public", "data");

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function countBy(arr, fn) {
  const c = {};
  for (const x of arr) { const k = fn(x); c[k] = (c[k] || 0) + 1; }
  return c;
}

function countArray(arr, fn) {
  const c = {};
  for (const x of arr) for (const v of fn(x)) c[v] = (c[v] || 0) + 1;
  return c;
}

function topEntries(obj, n = 10) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Jobs table
  db.run(`
    CREATE TABLE jobs (
      id TEXT PRIMARY KEY,
      firm_name TEXT NOT NULL, firm_slug TEXT, firm_type TEXT,
      job_title TEXT, date_posted TEXT, url TEXT, apply_url TEXT,
      locations TEXT, salary REAL, job_type TEXT,
      role_category TEXT, seniority_level TEXT, education_requirement TEXT,
      experience_min INTEGER, experience_max INTEGER,
      programming_languages TEXT, technologies TEXT, skills TEXT,
      asset_classes TEXT, work_mode TEXT
    )
  `);

  // Firms table
  db.run(`
    CREATE TABLE firms (
      firm_name TEXT PRIMARY KEY, firm_slug TEXT, firm_type TEXT,
      total_jobs INTEGER, phd_demand_pct INTEGER, ml_ai_focus_pct INTEGER, remote_pct INTEGER,
      salary_median REAL, salary_avg REAL, salary_count INTEGER,
      top_languages TEXT, top_skills TEXT, location_distribution TEXT,
      jobs_by_role TEXT, jobs_by_seniority TEXT
    )
  `);

  db.run("CREATE INDEX idx_jobs_firm ON jobs(firm_name)");
  db.run("CREATE INDEX idx_jobs_role ON jobs(role_category)");
  db.run("CREATE INDEX idx_jobs_seniority ON jobs(seniority_level)");
  db.run("CREATE INDEX idx_jobs_firm_type ON jobs(firm_type)");

  const jobs = JSON.parse(readFileSync(join(DATA_DIR, "jobs.json"), "utf-8"));

  // Insert jobs
  const jobStmt = db.prepare("INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  for (const j of jobs) {
    jobStmt.run([
      j.id, j.firmName, j.firmSlug, j.firmType, j.jobTitle, j.datePosted,
      j.url, j.applyUrl, JSON.stringify(j.locations), j.salary, j.jobType,
      j.roleCategory, j.seniorityLevel, j.educationRequirement,
      j.experienceYears?.min || null, j.experienceYears?.max || null,
      JSON.stringify(j.programmingLanguages), JSON.stringify(j.technologies),
      JSON.stringify(j.skills), JSON.stringify(j.assetClasses), j.workMode,
    ]);
  }
  jobStmt.free();

  // Compute and insert firms
  const firmGroups = new Map();
  for (const j of jobs) {
    if (!firmGroups.has(j.firmName)) firmGroups.set(j.firmName, []);
    firmGroups.get(j.firmName).push(j);
  }

  const firmStmt = db.prepare("INSERT INTO firms VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  for (const [name, fj] of firmGroups) {
    const salaries = fj.map(j => j.salary).filter(Boolean);
    const phdJobs = fj.filter(j => j.educationRequirement === "phd_required" || j.educationRequirement === "phd_preferred");
    const mlJobs = fj.filter(j => j.roleCategory === "machine_learning" || j.roleCategory === "data_science" || (j.skills || []).some(s => /ml|ai/i.test(s)));
    const remoteJobs = fj.filter(j => j.workMode === "remote" || j.workMode === "hybrid");
    const langs = countArray(fj, j => j.programmingLanguages || []);
    const skills = countArray(fj, j => j.skills || []);
    const locs = countArray(fj, j => j.locations || []);

    firmStmt.run([
      name, fj[0].firmSlug, fj[0].firmType, fj.length,
      fj.length > 0 ? Math.round((phdJobs.length / fj.length) * 100) : 0,
      fj.length > 0 ? Math.round((mlJobs.length / fj.length) * 100) : 0,
      fj.length > 0 ? Math.round((remoteJobs.length / fj.length) * 100) : 0,
      salaries.length > 0 ? median(salaries) : null,
      salaries.length > 0 ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : null,
      salaries.length,
      JSON.stringify(topEntries(langs, 10)),
      JSON.stringify(topEntries(skills, 10)),
      JSON.stringify(topEntries(locs, 10)),
      JSON.stringify(countBy(fj, j => j.roleCategory)),
      JSON.stringify(countBy(fj, j => j.seniorityLevel)),
    ]);
  }
  firmStmt.free();

  const data = db.export();
  const outPath = join(DATA_DIR, "jobs.db");
  writeFileSync(outPath, Buffer.from(data));

  console.log(`Built ${outPath}`);
  console.log(`  ${jobs.length} jobs, ${firmGroups.size} firms`);
  console.log(`  ${Math.round(data.length / 1024)} KB`);

  db.close();
}

main().catch(console.error);
