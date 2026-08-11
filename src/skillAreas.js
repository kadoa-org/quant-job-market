// Skill areas: the kind of work a posting is for.
//
// Rolls the two independent extraction outputs into one grouping — a domain
// skill tag OR a named tool counts a posting into an area, once. General-purpose
// languages and tooling (Python, C++, Linux, Excel, Git, AI assistants) map to
// no area on purpose: "writes code" is not a skill signal.
//
// Shared by InternshipsView (the ranked panels), App (the skillAreas filter),
// and FilterBar (the facet options). Mirrored in the share card generator,
// kadoa-backend services/custom/datasets/jobs/scripts/buildInternshipCycle.ts,
// and in the /internships SEO tables in scripts/prerenderSeo.mjs — keep the
// three definitions in sync.
export const SKILL_AREAS = [
  {
    name: "Statistics & time series",
    skills: [
      "Statistics",
      "Time Series",
      "Bayesian Methods",
      "Signal Processing",
      "Statistical Modeling",
      "Probabilistic Thinking",
      "Linear Algebra",
      "Data Analysis Techniques",
    ],
    tech: ["R", "MATLAB"],
  },
  {
    name: "Machine learning & AI",
    skills: ["ML/AI", "machine_learning", "Reinforcement Learning", "Computer Vision", "Deep Learning"],
    tech: [
      "PyTorch",
      "TensorFlow",
      "JAX",
      "scikit-learn",
      "XGBoost",
      "Hugging Face",
      "Ray",
      "MLflow",
      "CUDA",
      "OpenCL",
      "ROCm",
      "LangChain",
      "LangGraph",
      "MCP",
      "Bedrock",
      "Azure OpenAI",
      "vLLM",
      "Ollama",
    ],
  },
  {
    name: "Alpha research & backtesting",
    skills: ["Alpha Research", "alpha_research", "Backtesting", "backtesting", "Factor Models", "Data Mining"],
    tech: [],
  },
  {
    name: "Data engineering",
    skills: ["Data Engineering"],
    tech: [
      "SQL",
      "Pandas",
      "NumPy",
      "Polars",
      "Spark",
      "Hadoop",
      "Flink",
      "Kafka",
      "Airflow",
      "dbt",
      "Snowflake",
      "Databricks",
      "ClickHouse",
      "ArcticDB",
      "kdb+/q",
      "Redis",
      "MongoDB",
      "PostgreSQL",
      "MySQL",
      "SQL Server",
      "Cassandra",
      "Elasticsearch",
      "S3",
      "Parquet",
      "Arrow",
    ],
  },
  { name: "Natural language processing", skills: ["NLP", "natural_language_processing"], tech: [] },
  {
    name: "Risk & portfolio construction",
    skills: ["Risk Modeling", "Risk Management", "Portfolio Optimization", "Optimization", "Game Theory"],
    tech: ["Aladdin"],
  },
  {
    name: "Market microstructure & execution",
    skills: ["Market Microstructure", "Execution Algorithms", "Order Book Analysis"],
    tech: ["FIX"],
  },
  {
    name: "Derivatives & pricing",
    skills: ["Derivatives Pricing", "Options Pricing", "Options", "Stochastic Calculus", "Financial Modeling"],
    tech: [],
  },
  {
    name: "Low-latency & hardware",
    skills: [],
    tech: [
      "FPGA",
      "Verilog/VHDL",
      "SystemVerilog",
      "Verilog",
      "VHDL",
      "ASIC",
      "HLS",
      "Chisel",
      "CocoTB",
      "Tcl",
      "InfiniBand",
      "RDMA",
    ],
  },
  {
    name: "Cloud & DevOps",
    skills: [],
    tech: [
      "AWS",
      "GCP",
      "Azure",
      "Kubernetes",
      "Docker",
      "Terraform",
      "Ansible",
      "Puppet",
      "Jenkins",
      "GitLab CI",
      "GitHub Actions",
      "Grafana",
      "Prometheus",
      "Datadog",
      "Splunk",
      "Slurm",
    ],
  },
];

const lower = (s) => String(s).toLowerCase();
const MATCHERS = new Map(
  SKILL_AREAS.map((area) => {
    const skillSet = new Set(area.skills.map(lower));
    const techSet = new Set(area.tech.map(lower));
    return [
      area.name,
      (job) =>
        (job.skills ?? []).some((s) => skillSet.has(lower(s))) ||
        [...(job.programmingLanguages ?? []), ...(job.technologies ?? [])].some((t) => techSet.has(lower(t))),
    ];
  }),
);

export const SKILL_AREA_NAMES = SKILL_AREAS.map((a) => a.name);

/** True when the posting belongs to the named skill area. Unknown names never match. */
export function matchesSkillArea(job, areaName) {
  const match = MATCHERS.get(areaName);
  return match ? match(job) : false;
}

/** True when the posting belongs to any of the named areas (OR), or none are given. */
export function matchesAnySkillArea(job, areaNames) {
  if (!areaNames || areaNames.length === 0) return true;
  return areaNames.some((name) => matchesSkillArea(job, name));
}

/** Areas ranked by how many of the given postings fall into each, empties dropped. */
export function rankSkillAreas(jobs) {
  return SKILL_AREA_NAMES.map((name) => ({ name, count: jobs.filter((j) => matchesSkillArea(j, name)).length }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
