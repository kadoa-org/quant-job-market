// The generated SEO page lists (/tech/<slug>, /location/<slug>, /<role-slug>). The build script writes the pages from
// them and links to them in context (a firm page's cities and roles), rather than from a block of footer links.
export const TECHS = [
  { slug: "python", name: "Python" },
  { slug: "cpp", name: "C++" },
  { slug: "rust", name: "Rust" },
  { slug: "java", name: "Java" },
  { slug: "csharp", name: "C#" },
  { slug: "go", name: "Go" },
  { slug: "sql", name: "SQL" },
  { slug: "fpga", name: "FPGA" },
];

export const LOCATIONS = [
  { slug: "new-york", name: "New York" },
  { slug: "london", name: "London" },
  { slug: "singapore", name: "Singapore" },
  { slug: "hong-kong", name: "Hong Kong" },
  { slug: "chicago", name: "Chicago" },
  { slug: "sydney", name: "Sydney" },
  { slug: "boston", name: "Boston" },
  { slug: "paris", name: "Paris" },
  { slug: "mumbai", name: "Mumbai" },
  { slug: "miami", name: "Miami" },
  { slug: "amsterdam", name: "Amsterdam" },
  { slug: "austin", name: "Austin" },
];

export const ROLES = [
  { slug: "quant-researcher-jobs", key: "quantitative_research", name: "Quantitative Researcher" },
  { slug: "quant-developer-jobs", key: "quantitative_development", name: "Quantitative Developer" },
  { slug: "quant-trader-jobs", key: "quantitative_trading", name: "Quantitative Trader" },
  { slug: "machine-learning-engineer-jobs", key: "machine_learning", name: "Machine Learning Engineer" },
  { slug: "data-scientist-jobs", key: "data_science", name: "Data Scientist" },
  { slug: "quant-software-engineer-jobs", key: "software_engineering", name: "Software Engineer" },
  { slug: "hft-jobs", key: "hft_systems", name: "HFT" },
];
