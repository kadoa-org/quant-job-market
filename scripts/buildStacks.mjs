// Build public/data/stacks.json: per-firm tech stacks with adoption tiers.
//
// Tiers, not percentages: postings are heterogeneous, so "31% of jobs" implies
// precision the data does not have. A tech is core / regular / occasional in a
// shop based on how often the firm's own postings name it, and the raw count
// ships in the JSON so the UI can show "named in N of M postings" on hover.
// Core requires SHARE (>=20%, or >=12 mentions at >=12%): an absolute-count
// gate alone marked JavaScript "core" at a 170-posting firm off 14 mentions.
//
// Inputs: public/data/jobs.json (daily) + enrichment/stack-extract-2026-08.jsonl
// (one-off Gemini deep extraction over 16 marquee firms' posting text; job ids
// age out of jobs.json as postings close, so this is a dated snapshot).
import fs from "node:fs";

const jobs = JSON.parse(fs.readFileSync("public/data/jobs.json", "utf8"));
const ALIAS = { "KDB+/Q": "kdb+/q", "kdb+": "kdb+/q", Q: "kdb+/q", K8s: "Kubernetes", Golang: "Go",
  Postgres: "PostgreSQL", "Amazon Web Services": "AWS", "Google Cloud": "GCP",
  "Google Cloud Platform": "GCP", "Apache Kafka": "Kafka", "Apache Airflow": "Airflow",
  "Apache Spark": "Spark", GKE: "Kubernetes", EKS: "Kubernetes" };
const canon = (t) => ALIAS[t.trim()] ?? t.trim();

const enrich = new Map();
if (fs.existsSync("enrichment/stack-extract-2026-08.jsonl")) {
  for (const line of fs.readFileSync("enrichment/stack-extract-2026-08.jsonl", "utf8").split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    enrich.set(r.id, r.techs.map(canon));
  }
}

const LAYERS = {
  fe: ["TypeScript", "JavaScript", "React", "Angular", "Vue"],
  be: ["C++", "Java", "C", "C#", "Rust", "Go", "OCaml", "Scala", "CUDA", "Verilog/VHDL"],
  data: ["Python", "SQL", "R", "MATLAB", "Julia", "kdb+/q", "Kafka", "Airflow", "Spark", "Flink", "dbt",
    "Snowflake", "Databricks", "ClickHouse", "ArcticDB", "PostgreSQL", "MySQL", "SQL Server", "MongoDB",
    "Cassandra", "Redis", "Elasticsearch", "InfluxDB", "TimescaleDB", "Iceberg", "Parquet", "Arrow",
    "Pandas", "NumPy", "Polars", "PyTorch", "TensorFlow", "JAX", "Ray", "Dask", "scikit-learn",
    "XGBoost", "Hadoop", "Bloomberg", "Refinitiv", "FIX"],
  infra: ["Linux", "AWS", "GCP", "Azure", "Kubernetes", "Docker", "Terraform", "Ansible", "Slurm",
    "Grafana", "Prometheus", "FPGA", "InfiniBand", "RDMA", "S3", "Jenkins", "Bash"],
};
const L_OF = new Map(Object.entries(LAYERS).flatMap(([L, ts]) => ts.map((t) => [t, L])));

const techsOf = (j) => {
  const base = new Set([...(j.programmingLanguages ?? []), ...(j.technologies ?? [])].map(canon));
  for (const t of enrich.get(j.id) ?? []) base.add(t);
  return [...base].filter((t) => L_OF.has(t));
};

const per = new Map();
const g = new Map();
let gn = 0;
for (const j of jobs) {
  const f = j.firmName;
  const ts = techsOf(j);
  if (!f || ts.length === 0) continue;
  gn++;
  if (!per.has(f)) per.set(f, { n: 0, enriched: 0, cnt: new Map() });
  const d = per.get(f);
  d.n++;
  if (enrich.has(j.id)) d.enriched++;
  for (const t of ts) {
    d.cnt.set(t, (d.cnt.get(t) ?? 0) + 1);
    g.set(t, (g.get(t) ?? 0) + 1);
  }
}

const tier = (n, tagged) => {
  const s = n / tagged;
  if (s >= 0.2 || (n >= 12 && s >= 0.12)) return "core";
  if (s >= 0.07 || n >= 4) return "regular";
  if (n >= 2) return "occasional";
  return null;
};

const firms = [];
for (const [f, d] of per) {
  if (d.n < 15) continue;
  const techs = [...d.cnt]
    .map(([t, n]) => ({ t, layer: L_OF.get(t), n, tier: tier(n, d.n) }))
    .filter((x) => x.tier)
    .sort((a, b) => b.n - a.n);
  const sig = [...d.cnt]
    .map(([t, n]) => ({ t, lift: n / d.n / (g.get(t) / gn), n, s: n / d.n }))
    .filter((x) => x.n >= 4 && x.s >= 0.08 && x.lift >= 1.4)
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 3)
    .map((x) => x.t);
  firms.push({ firm: f, tagged: d.n, deep: d.enriched >= 10, sig, techs });
}
firms.sort((a, b) => b.tagged - a.tagged);

fs.writeFileSync(
  "public/data/stacks.json",
  JSON.stringify({ generated: new Date().toISOString().slice(0, 10), taggedPostings: gn, firms }),
);
console.log(`stacks.json: ${firms.length} firms, ${gn} tagged postings`);
