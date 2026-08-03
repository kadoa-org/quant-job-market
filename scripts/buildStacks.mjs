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
  "Apache Spark": "Spark", GKE: "Kubernetes", EKS: "Kubernetes",
  "GitHub Copilot": "Copilot", HuggingFace: "Hugging Face", Anthropic: "Claude",
  "AWS Bedrock": "Bedrock", "Amazon Bedrock": "Bedrock", SystemVerilog: "Verilog/VHDL",
  Verilog: "Verilog/VHDL", VHDL: "Verilog/VHDL" };
const canon = (t) => ALIAS[t.trim()] ?? t.trim();

const enrich = new Map();
if (fs.existsSync("enrichment/stack-extract-2026-08.jsonl")) {
  for (const line of fs.readFileSync("enrichment/stack-extract-2026-08.jsonl", "utf8").split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    enrich.set(r.id, r.techs.map(canon));
  }
}

// Frontend is incidental at most quant firms (half the cards read "none
// named"), so web techs fold into one Languages row instead of their own.
const LAYERS = {
  be: ["C++", "Java", "C", "C#", "Rust", "Go", "OCaml", "Scala", "CUDA", "Verilog/VHDL", "VBA", ".NET",
    "TypeScript", "JavaScript", "React", "Angular", "Vue"],
  data: ["Python", "SQL", "R", "MATLAB", "Julia", "kdb+/q", "Kafka", "Airflow", "Spark", "Flink", "dbt",
    "Snowflake", "Databricks", "ClickHouse", "ArcticDB", "PostgreSQL", "MySQL", "SQL Server", "MongoDB",
    "Cassandra", "Redis", "Elasticsearch", "InfluxDB", "TimescaleDB", "Iceberg", "Parquet", "Arrow",
    "Pandas", "NumPy", "Polars", "SciPy", "Dask", "Hadoop", "Bloomberg", "Refinitiv", "FIX", "Aladdin", "Tableau", "Power BI"],
  // ML frameworks + GenAI tooling. GenAI names only surface for deep-read
  // firms (the daily classifier's vocabulary does not carry them yet).
  ai: ["PyTorch", "TensorFlow", "JAX", "Keras", "scikit-learn", "XGBoost", "LightGBM", "Ray", "MLflow",
    "Weights & Biases", "Claude", "ChatGPT", "Gemini", "Copilot", "Cursor", "LangChain", "LangGraph",
    "Hugging Face", "vLLM", "Ollama", "Bedrock", "Azure OpenAI", "MCP"],
  infra: ["Linux", "AWS", "GCP", "Azure", "Kubernetes", "Docker", "Terraform", "Ansible", "Slurm",
    "Grafana", "Prometheus", "Splunk", "Datadog", "FPGA", "InfiniBand", "RDMA", "S3", "Jenkins", "Bash", "Windows", "PowerShell", "CloudFormation",
    "GitLab CI", "GitHub Actions"],
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
  if (!per.has(f)) per.set(f, { n: 0, enriched: 0, cnt: new Map(), types: new Map() });
  const d = per.get(f);
  d.n++;
  if (j.firmType) d.types.set(j.firmType, (d.types.get(j.firmType) ?? 0) + 1);
  if (enrich.has(j.id)) d.enriched++;
  for (const t of ts) {
    d.cnt.set(t, (d.cnt.get(t) ?? 0) + 1);
    g.set(t, (g.get(t) ?? 0) + 1);
  }
}

// One inclusion bar, no tiers: a tech is on the card when the firm's own
// postings name it often enough to call it part of how the firm hires
// (>=2 mentions AND >=7% of tagged postings or >=4 mentions). Frequency stays in the
// per-tech count, which the UI shows on hover and ranks by in the tech lens.
const inStack = (n, tagged) => n >= 2 && (n / tagged >= 0.07 || n >= 4);

const firms = [];
for (const [f, d] of per) {
  if (d.n < 10) continue;
  const techs = [...d.cnt]
    .map(([t, n]) => ({ t, layer: L_OF.get(t), n }))
    .filter((x) => inStack(x.n, d.n))
    .sort((a, b) => b.n - a.n);
  const sig = [...d.cnt]
    .map(([t, n]) => ({ t, lift: n / d.n / (g.get(t) / gn), n, s: n / d.n }))
    .filter((x) => x.n >= 4 && x.s >= 0.08 && x.lift >= 1.4)
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 3)
    .map((x) => x.t);
  const firmType = [...d.types].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  firms.push({ firm: f, firmType, tagged: d.n, deep: d.enriched >= 10, sig, techs });
}
firms.sort((a, b) => b.tagged - a.tagged);

fs.writeFileSync(
  "public/data/stacks.json",
  JSON.stringify({ generated: new Date().toISOString().slice(0, 10), taggedPostings: gn, firms }),
);
console.log(`stacks.json: ${firms.length} firms, ${gn} tagged postings`);
