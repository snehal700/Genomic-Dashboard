import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { api } from "./api";

const COLORS = {
  navy: "#1b2a4a",
  navyDark: "#141f38",
  orange: "#f5a623",
  blue: "#3b6fd6",
  greyBg: "#eef1f6",
};

const COHORT_COLORS = { CON: "#3b6fd6", CTN: "#f5a623", CS: "#d64545", COT: "#8a4fd6" };
const POLYPHEN_COLORS = {
  benign: "#2fa66a",
  possibly_damaging: "#f5a623",
  probably_damaging: "#d64545",
  unknown: "#9aa5b8",
  not_recorded: "#c7cedd",
};

const COMPARISONS = [
  { key: "CON_vs_CTN", label: "CON vs CTN" },
  { key: "CON_vs_CS", label: "CON vs CS" },
  { key: "CON_vs_COT", label: "CON vs COT" },
  { key: "CON_vs_ALL", label: "CON vs ALL Cancer" },
];

export default function App() {
  const [gene, setGene] = useState("BRCA1");
  const [geneInput, setGeneInput] = useState("BRCA1");
  const [resultType, setResultType] = useState("Somatic");
  const [comparison, setComparison] = useState("CON_vs_ALL");

  const [summary, setSummary] = useState([]);
  const [aggregates, setAggregates] = useState(null);
  const [detail, setDetail] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getSummary(gene, resultType),
      api.getAggregates(gene, resultType, comparison),
      api.getDetail(gene, resultType, comparison, page, 100),
    ])
      .then(([s, a, d]) => {
        if (cancelled) return;
        setSummary(s);
        setAggregates(a);
        setDetail(d);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [gene, resultType, comparison, page]);

  const totals = useMemo(() => {
    const total_patients = summary.reduce((a, r) => a + r.total_patients, 0);
    const carriers = summary.reduce((a, r) => a + r.carriers, 0);
    const total_variant_rows = summary.reduce((a, r) => a + r.total_variant_rows, 0);
    const unique_rsids = summary.reduce((a, r) => a + r.unique_rsids, 0);
    return {
      total_patients, carriers, total_variant_rows, unique_rsids,
      carrier_pct: total_patients ? ((100 * carriers) / total_patients).toFixed(1) : 0,
    };
  }, [summary]);

  const polyphenChartData = useMemo(() => {
    if (!aggregates) return [];
    const groups = {};
    aggregates.polyphen.forEach((r) => {
      groups[r.compare_group] ??= { compare_group: r.compare_group };
      groups[r.compare_group][r.polyphen_class] = r.n;
    });
    return Object.values(groups);
  }, [aggregates]);

  const carrierRateData = useMemo(() => {
    if (!aggregates) return [];
    return aggregates.carrier_rate.map((r) => ({
      compare_group: r.compare_group,
      rate: r.n_patients ? +((100 * r.n_carriers) / r.n_patients).toFixed(1) : 0,
    }));
  }, [aggregates]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.greyBg, fontFamily: "system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 260, background: COLORS.navy, color: "#dfe6f2", padding: "24px 18px" }}>
        <div style={{ fontWeight: 800, fontSize: "1.15rem", marginBottom: 24 }}>🧬 Gene Explorer</div>

        <label style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".05em", color: "#8a95b8" }}>SEARCH GENE</label>
        <form onSubmit={(e) => { e.preventDefault(); setGene(geneInput.trim().toUpperCase()); setPage(1); }}>
          <input
            value={geneInput}
            onChange={(e) => setGeneInput(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 6, marginBottom: 16, borderRadius: 8, border: "none" }}
          />
        </form>

        <label style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".05em", color: "#8a95b8" }}>RESULT TYPE</label>
        <div style={{ display: "flex", gap: 8, margin: "8px 0 20px" }}>
          {["Somatic", "Germline"].map((rt) => (
            <button key={rt} onClick={() => { setResultType(rt); setPage(1); }}
              style={btnStyle(resultType === rt)}>{rt}</button>
          ))}
        </div>

        <label style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".05em", color: "#8a95b8" }}>COHORT COMPARISON</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {COMPARISONS.map((c) => (
            <button key={c.key} onClick={() => { setComparison(c.key); setPage(1); }}
              style={{ ...btnStyle(comparison === c.key), textAlign: "left" }}>{c.label}</button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "32px 40px" }}>
        <h1 style={{ color: COLORS.navyDark, margin: 0 }}>Dashboard — {gene}</h1>
        <p style={{ color: "#6b7280" }}>{resultType} · {COMPARISONS.find((c) => c.key === comparison)?.label}</p>

        {error && <div style={{ color: "#d64545" }}>Error: {error}</div>}
        {loading && <div>Loading…</div>}

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, margin: "20px 0" }}>
          {[
            ["Total Patients", totals.total_patients],
            ["Carriers", totals.carriers],
            ["Variant Rows", totals.total_variant_rows],
            ["Carrier Rate", `${totals.carrier_pct}%`],
          ].map(([label, value]) => (
            <div key={label} style={{ background: "white", borderRadius: 14, padding: 18, boxShadow: "0 2px 10px rgba(20,31,56,0.08)" }}>
              <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{label}</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: COLORS.navyDark }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <ChartCard title="Carrier Rate by Group">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={carrierRateData}>
                <CartesianGrid stroke="#eef1f6" />
                <XAxis dataKey="compare_group" />
                <YAxis unit="%" />
                <Tooltip />
                <Bar dataKey="rate">
                  {carrierRateData.map((entry, i) => (
                    <Cell key={i} fill={COHORT_COLORS[entry.compare_group] || COLORS.navyDark} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="PolyPhen Classification by Group">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={polyphenChartData}>
                <CartesianGrid stroke="#eef1f6" />
                <XAxis dataKey="compare_group" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(POLYPHEN_COLORS).map((cls) => (
                  <Bar key={cls} dataKey={cls} stackId="a" fill={POLYPHEN_COLORS[cls]} name={cls.replace("_", " ")} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Detail table */}
        <div style={{ background: "white", borderRadius: 14, padding: 18, marginTop: 20, boxShadow: "0 2px 10px rgba(20,31,56,0.06)" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Individual Variant Rows {detail ? `(${detail.total.toLocaleString()} total)` : ""}
          </div>
          <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem" }}>
              <thead>
                <tr>
                  {detail?.rows[0] && Object.keys(detail.rows[0]).map((col) => (
                    <th key={col} style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #e7ecf5", position: "sticky", top: 0, background: "white" }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail?.rows.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} style={{ padding: 6, borderBottom: "1px solid #f2f4f8" }}>{String(v ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detail && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={btnStyle(false)}>Prev</button>
              <span>Page {page} of {Math.max(1, Math.ceil(detail.total / detail.page_size))}</span>
              <button disabled={page * detail.page_size >= detail.total} onClick={() => setPage((p) => p + 1)} style={btnStyle(false)}>Next</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: "white", borderRadius: 14, padding: 18, boxShadow: "0 2px 10px rgba(20,31,56,0.06)" }}>
      <div style={{ fontWeight: 700, marginBottom: 10, color: COLORS.navyDark }}>{title}</div>
      {children}
    </div>
  );
}

function btnStyle(active) {
  return {
    padding: "8px 12px",
    borderRadius: 10,
    border: active ? "none" : "1px solid rgba(255,255,255,0.16)",
    background: active ? `linear-gradient(135deg, ${COLORS.orange}, #ffbf4d)` : "rgba(255,255,255,0.06)",
    color: active ? COLORS.navyDark : "#dfe6f2",
    fontWeight: 700,
    cursor: "pointer",
  };
}
