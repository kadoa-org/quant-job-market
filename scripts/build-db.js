/**
 * Build SQLite database for client-side use from JSON data files.
 * Run: node scripts/build-db.js
 */

import initSqlJs from "sql.js";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "public", "data");

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Create tables
  db.run(`
    CREATE TABLE jobs (
      id TEXT PRIMARY KEY,
      firm_name TEXT NOT NULL,
      firm_slug TEXT,
      firm_type TEXT,
      job_title TEXT,
      date_posted TEXT,
      url TEXT,
      apply_url TEXT,
      locations TEXT,
      salary REAL,
      job_type TEXT,
      role_category TEXT,
      seniority_level TEXT,
      education_requirement TEXT,
      experience_min INTEGER,
      experience_max INTEGER,
      programming_languages TEXT,
      technologies TEXT,
      skills TEXT,
      asset_classes TEXT,
      work_mode TEXT
    )
  `);

  db.run(`
    CREATE TABLE firms (
      firm_name TEXT PRIMARY KEY,
      firm_slug TEXT,
      firm_type TEXT,
      total_jobs INTEGER,
      phd_demand_pct INTEGER,
      ml_ai_focus_pct INTEGER,
      remote_pct INTEGER,
      salary_median REAL,
      salary_avg REAL,
      salary_count INTEGER,
      top_languages TEXT,
      top_skills TEXT,
      location_distribution TEXT,
      jobs_by_role TEXT,
      jobs_by_seniority TEXT
    )
  `);

  // Indexes
  db.run("CREATE INDEX idx_jobs_firm ON jobs(firm_name)");
  db.run("CREATE INDEX idx_jobs_role ON jobs(role_category)");
  db.run("CREATE INDEX idx_jobs_seniority ON jobs(seniority_level)");
  db.run("CREATE INDEX idx_jobs_firm_type ON jobs(firm_type)");

  // Load JSON data
  const jobs = JSON.parse(readFileSync(join(DATA_DIR, "jobs.json"), "utf-8"));
  const firms = JSON.parse(readFileSync(join(DATA_DIR, "firms.json"), "utf-8"));

  // Insert jobs
  const jobStmt = db.prepare(`
    INSERT INTO jobs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const j of jobs) {
    jobStmt.run([
      j.id,
      j.firmName,
      j.firmSlug,
      j.firmType,
      j.jobTitle,
      j.datePosted,
      j.url,
      j.applyUrl,
      JSON.stringify(j.locations),
      j.salary,
      j.jobType,
      j.roleCategory,
      j.seniorityLevel,
      j.educationRequirement,
      j.experienceYears?.min || null,
      j.experienceYears?.max || null,
      JSON.stringify(j.programmingLanguages),
      JSON.stringify(j.technologies),
      JSON.stringify(j.skills),
      JSON.stringify(j.assetClasses),
      j.workMode,
    ]);
  }
  jobStmt.free();

  // Insert firms
  const firmStmt = db.prepare(`
    INSERT INTO firms VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const f of firms) {
    firmStmt.run([
      f.firmName,
      f.firmSlug,
      f.firmType,
      f.totalJobs,
      f.phdDemandPct,
      f.mlAiFocusPct,
      f.remotePct,
      f.salaryStats?.median || null,
      f.salaryStats?.avg || null,
      f.salaryStats?.count || 0,
      JSON.stringify(f.topLanguages),
      JSON.stringify(f.topSkills),
      JSON.stringify(f.locationDistribution),
      JSON.stringify(f.jobsByRole),
      JSON.stringify(f.jobsBySeniority),
    ]);
  }
  firmStmt.free();

  // Export
  const data = db.export();
  const outPath = join(DATA_DIR, "jobs.db");
  writeFileSync(outPath, Buffer.from(data));

  const sizeKB = Math.round(data.length / 1024);
  console.log(`Built ${outPath}`);
  console.log(`  ${jobs.length} jobs, ${firms.length} firms`);
  console.log(`  ${sizeKB} KB`);

  db.close();
}

main().catch(console.error);
