export const FIRM_TYPE_COLORS = {
  hedge_fund: "#8b5cf6", // Purple
  proprietary: "#f97316", // Orange
  market_maker: "#06b6d4", // Cyan
  bank: "#3b82f6", // Blue
  asset_manager: "#10b981", // Green
  private_equity: "#ec4899", // Pink
  sovereign_fund: "#eab308", // Yellow
  consulting: "#6b7280", // Gray
  other: "#6b7280",
};

export const FIRM_TYPE_LABELS = {
  hedge_fund: "Hedge Fund",
  proprietary: "Prop Trading",
  market_maker: "Market Maker",
  bank: "Bank",
  asset_manager: "Asset Manager",
  private_equity: "Private Equity",
  sovereign_fund: "Sovereign Fund",
  consulting: "Consulting",
  other: "Other",
};

export const ROLE_COLORS = {
  quantitative_research: "#8b5cf6",
  quantitative_trading: "#f97316",
  quantitative_development: "#06b6d4",
  data_science: "#10b981",
  machine_learning: "#ec4899",
  software_engineering: "#3b82f6",
  hft_systems: "#ef4444",
  risk_management: "#eab308",
  portfolio_management: "#f59e0b",
  operations: "#6b7280",
  compliance: "#78716c",
  sales_trading: "#a855f7",
  business_development: "#14b8a6",
  other: "#4b5563",
};

export const ROLE_LABELS = {
  quantitative_research: "Quant Research",
  quantitative_trading: "Quant Trading",
  quantitative_development: "Quant Dev",
  data_science: "Data Science",
  machine_learning: "ML / AI",
  software_engineering: "Software Eng",
  hft_systems: "HFT Systems",
  risk_management: "Risk",
  portfolio_management: "Portfolio Mgmt",
  operations: "Operations",
  compliance: "Compliance",
  sales_trading: "Sales & Trading",
  business_development: "Business Dev",
  other: "Other",
};

export const SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "lead", "vp_director", "executive"];

export const SENIORITY_LABELS = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
  vp_director: "VP/Director",
  executive: "Executive",
};

export const COLOR_LAYERS = [
  { key: "firmType", label: "Firm Type" },
  { key: "mlAiFocusPct", label: "AI/ML %" },
  { key: "phdDemandPct", label: "PhD Demand" },
  { key: "medianSalary", label: "Salary" },
  { key: "pythonPct", label: "Python %" },
  { key: "cppPct", label: "C++ %" },
  { key: "remotePct", label: "Remote %" },
];

// Green to red gradient for percentage metrics
export function pctToColor(pct) {
  // 0% = green, 50% = yellow, 100% = red
  const t = Math.min(1, Math.max(0, pct / 100));
  const r = Math.round(t < 0.5 ? t * 2 * 255 : 255);
  const g = Math.round(t < 0.5 ? 255 : (1 - (t - 0.5) * 2) * 255);
  return `rgb(${r}, ${g}, 60)`;
}

export function salaryToColor(salary) {
  if (!salary) return "#333";
  // Log scale: $50k = green, $200k = yellow, $500k+ = red
  const t = Math.min(1, Math.max(0, (Math.log(salary) - Math.log(50000)) / (Math.log(500000) - Math.log(50000))));
  return pctToColor(t * 100);
}
