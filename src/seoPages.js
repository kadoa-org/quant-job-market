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
  // Added 27 Sep 2026: every city with 20+ open roles at 3+ firms. City pages have the site's best click-through.
  { slug: "bangalore", name: "Bangalore" },
  { slug: "dublin", name: "Dublin" },
  { slug: "toronto", name: "Toronto" },
  { slug: "montreal", name: "Montreal" },
  { slug: "greenwich", name: "Greenwich" },
  { slug: "stamford", name: "Stamford" },
  { slug: "houston", name: "Houston" },
  { slug: "san-francisco", name: "San Francisco" },
  { slug: "warsaw", name: "Warsaw" },
  { slug: "budapest", name: "Budapest" },
  { slug: "geneva", name: "Geneva" },
  { slug: "zug", name: "Zug" },
  { slug: "tokyo", name: "Tokyo" },
  { slug: "shanghai", name: "Shanghai" },
  { slug: "gurgaon", name: "Gurgaon" },
  { slug: "dubai", name: "Dubai" },
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
