import React, { useEffect, useMemo, useState } from "react";

// Per-firm stack cards: each firm's hiring stack as four layers with tiered
// technology chips. Tiers (core / regular / occasional) come from how often the
// firm's own postings name a tool, not a percentage: postings are heterogeneous,
// so "31% of jobs" overstates precision while "core to this shop" is the claim
// the data supports. Raw counts stay one hover away on every chip.
//
// Two lenses, StackShare-style: pick a firm to see its full stack, or pick a
// technology to see every firm that hires for it, with that firm's tier.

const BASE = import.meta.env.BASE_URL;

const LAYER_LABEL = { fe: "Frontend", be: "Backend", data: "Data", infra: "Infra" };
const LAYER_ORDER = ["fe", "be", "data", "infra"];
const LAYER_COLOR = { fe: "#eda100", be: "#eb6834", data: "#2a78d6", infra: "#1baf7a" };
const LAYER_TINT = { fe: "#fdf3dd", be: "#fdeae2", data: "#e6effa", infra: "#e2f5ee" };

const TIER_LABEL = { core: "Core", regular: "Regular", occasional: "Occasional" };

function article(word) {
  if (!word) return "a";
  const VOWEL_SOUND = new Set([
    "F",
    "FPGA",
    "R",
    "S",
    "SQL",
    "M",
    "N",
    "L",
    "X",
    "H",
    "AWS",
    "OCAML",
    "ARCTICDB",
    "AIRFLOW",
    "AZURE",
    "INFINIBAND",
    "ICEBERG",
    "ELASTICSEARCH",
  ]);
  return /^[AEIOU]/i.test(word) || VOWEL_SOUND.has(word.split("+")[0].toUpperCase()) ? "an" : "a";
}

function Chip({ tech, firmTagged, onClick, active }) {
  const c = LAYER_COLOR[tech.layer];
  const styles = {
    core: { background: c, borderColor: c, color: "#fff", fontWeight: 600 },
    regular: { background: LAYER_TINT[tech.layer], borderColor: c, color: "var(--dk-ink)", fontWeight: 600 },
    occasional: { background: "transparent", borderColor: "var(--dk-rule)", color: "var(--dk-muted)", fontWeight: 400 },
  }[tech.tier];
  return (
    <button
      type="button"
      className="stk-chip"
      style={{ ...styles, ...(active ? { outline: "2px solid var(--dk-ink)", outlineOffset: 1 } : {}) }}
      title={`${tech.t}: named in ${tech.n} of ${firmTagged} tech-tagged postings (${TIER_LABEL[tech.tier].toLowerCase()})`}
      onClick={onClick}
    >
      {tech.t}
    </button>
  );
}

function Strata({ firm, onTech, activeTech, compact }) {
  const cap = compact ? 4 : 99;
  return (
    <div>
      {LAYER_ORDER.map((L) => {
        const rows = firm.techs.filter((t) => t.layer === L).slice(0, cap);
        return (
          <div key={L} className="stk-band">
            <span className="stk-bl" style={{ color: LAYER_COLOR[L] }}>
              {LAYER_LABEL[L]}
            </span>
            <span className="stk-chips">
              {rows.length === 0 ? (
                <span className="stk-none">none named</span>
              ) : (
                rows.map((t) => (
                  <Chip
                    key={t.t}
                    tech={t}
                    firmTagged={firm.tagged}
                    active={activeTech === t.t}
                    onClick={() => onTech(t.t)}
                  />
                ))
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Signature({ firm }) {
  if (!firm.sig?.length) return null;
  return (
    <div className="stk-sig">
      {article(firm.sig[0])} <b>{firm.sig.join(" · ")}</b> shop
    </div>
  );
}

export default function StackCards() {
  const [data, setData] = useState(null);
  const [firmSel, setFirmSel] = useState(null);
  const [techSel, setTechSel] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch(`${BASE}data/stacks.json`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ firms: [] }));
  }, []);

  const firms = data?.firms ?? [];
  const allTechs = useMemo(() => {
    const m = new Map();
    for (const f of firms) for (const t of f.techs) if (!m.has(t.t)) m.set(t.t, t.layer);
    return m;
  }, [firms]);

  const pickTech = (t) => {
    setTechSel(t);
    setFirmSel(null);
    setQ("");
    window.scrollTo(0, 0);
  };
  const pickFirm = (f) => {
    setFirmSel(f);
    setTechSel(null);
    setQ("");
    window.scrollTo(0, 0);
  };
  const clear = () => {
    setFirmSel(null);
    setTechSel(null);
    setQ("");
  };

  if (!data) return <p className="dk-hint">Loading stacks…</p>;

  const term = q.trim().toLowerCase();
  const firmMatches = term ? firms.filter((f) => f.firm.toLowerCase().includes(term)) : [];
  const techMatches = term ? [...allTechs.keys()].filter((t) => t.toLowerCase().includes(term)).slice(0, 8) : [];

  const selFirm = firmSel ? firms.find((f) => f.firm === firmSel) : null;
  const techFirms = techSel
    ? firms
        .map((f) => ({ f, hit: f.techs.find((t) => t.t === techSel) }))
        .filter((x) => x.hit)
        .sort((a, b) => b.hit.n / b.f.tagged - a.hit.n / a.f.tagged)
    : [];

  return (
    <div className="stk">
      <div className="stk-head">
        <div>
          <h1 className="dk-h1">Firm stack cards</h1>
          <p className="dk-hint">
            Each firm's hiring stack, from its own job postings. Chip weight = how often the firm names it: solid is
            core, tinted is regular, outlined is occasional. Hover any chip for the raw count.
          </p>
        </div>
        <div className="stk-search">
          <input
            className="dk-input"
            placeholder="Find a firm or a technology…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Find a firm or a technology"
          />
          {term && (firmMatches.length > 0 || techMatches.length > 0) && (
            <div className="stk-suggest">
              {firmMatches.slice(0, 5).map((f) => (
                <button key={f.firm} type="button" onClick={() => pickFirm(f.firm)}>
                  {f.firm} <span className="dk-hint">firm</span>
                </button>
              ))}
              {techMatches.map((t) => (
                <button key={t} type="button" onClick={() => pickTech(t)}>
                  {t} <span className="dk-hint">technology</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {(selFirm || techSel) && (
        <button type="button" className="dk-btn stk-back" onClick={clear}>
          ← All firms
        </button>
      )}

      {selFirm ? (
        <div className="stk-detail">
          <div className="stk-detail-head">
            <h2>{selFirm.firm}</h2>
            <span className="dk-hint">
              {selFirm.tagged} tech-tagged postings{selFirm.deep ? " · deep-extracted" : ""}
            </span>
          </div>
          <Strata firm={selFirm} onTech={pickTech} activeTech={null} />
          <Signature firm={selFirm} />
        </div>
      ) : techSel ? (
        <div>
          <h2 className="stk-tech-h">
            Who hires for{" "}
            <span
              className="stk-chip"
              style={{
                background: LAYER_COLOR[allTechs.get(techSel)],
                borderColor: LAYER_COLOR[allTechs.get(techSel)],
                color: "#fff",
              }}
            >
              {techSel}
            </span>
            ?
          </h2>
          <div className="stk-tech-list">
            {techFirms.map(({ f, hit }) => (
              <div key={f.firm} className="stk-tech-row">
                <button type="button" className="stk-firmlink" onClick={() => pickFirm(f.firm)}>
                  {f.firm}
                </button>
                <span className={`stk-tierbadge stk-tier-${hit.tier}`}>{TIER_LABEL[hit.tier]}</span>
                <span className="dk-hint stk-count">
                  {hit.n} of {f.tagged} postings
                </span>
                <span className="stk-minichips">
                  {f.techs
                    .filter((t) => t.tier === "core" && t.t !== techSel)
                    .slice(0, 4)
                    .map((t) => (
                      <Chip key={t.t} tech={t} firmTagged={f.tagged} onClick={() => pickTech(t.t)} />
                    ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="stk-grid">
          {firms.map((f) => (
            <div key={f.firm} className="stk-card">
              <div className="stk-card-head">
                <button type="button" className="stk-firmlink" onClick={() => pickFirm(f.firm)}>
                  {f.firm}
                </button>
                <span className="dk-hint">{f.tagged} postings</span>
              </div>
              <Strata firm={f} onTech={pickTech} activeTech={null} compact />
              <Signature firm={f} />
            </div>
          ))}
        </div>
      )}

      <p className="dk-hint stk-foot">
        Hiring signal from live postings, not a claim about internal systems. "a … shop" = what the firm over-indexes on
        versus the whole industry. Firms with 15+ tech-tagged postings shown; deep-extracted firms had their full
        posting text re-read for technology mentions in August 2026.
      </p>
    </div>
  );
}
