import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Home, Search, UserRound, UsersRound, Dna, ChartNoAxesCombined } from "lucide-react";
import "./SampleBrowser.css";

const API = "http://127.0.0.1:8000";
const examples = ["5A0155", "5A1861", "5A0504"];

export default function SampleSearch() {
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault(); const value = id.trim();
    if (!value) { setError("Please enter a Sample ID."); return; }
    setLoading(true); setError("");
    try { const response = await fetch(`${API}/api/samples/${encodeURIComponent(value)}/overview?result_type=Somatic`); if (!response.ok) { setError(`Sample ID '${value}' was not found in the project data.`); return; } navigate(`/samples/${encodeURIComponent(value)}`); }
    catch { setError("Could not connect to the genomic database. Make sure FastAPI is running."); }
    finally { setLoading(false); }
  };
  return <main className="sample-page sample-search-page">
    <header className="sample-header sample-search-header"><div><div className="sample-crumb">Genomic Portal <span>/</span> Sample Browser</div><div className="sample-title-row"><div className="sample-title-icon"><UserRound size={27} /></div><div><h1>Sample Browser</h1><p>Search and explore patient-level genomic variation</p></div></div></div><nav className="sample-nav" aria-label="Page navigation"><button type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} />Go Back</button><button type="button" onClick={() => navigate("/")}><Home size={16} />Dashboard</button></nav></header>
    <section className="sample-search-card"><div className="sample-search-card-header"><div className="sample-icon"><UsersRound size={23} /></div><div className="sample-search-copy"><span>Patient lookup</span><h2>Search by Sample ID</h2><p>Enter a patient identifier to view its somatic and germline variants, annotation profile, and genomic distribution.</p></div></div><form className="sample-search-form" onSubmit={submit}><div className="sample-input-wrapper"><Search className="sample-input-icon" size={19} /><input value={id} onChange={(event) => { setId(event.target.value); setError(""); }} placeholder="Enter Sample ID, e.g. 5A0155" autoComplete="off" /></div><button disabled={loading}>{loading ? "Searching..." : <><Search size={16} />Search Sample</>}</button></form>{error && <div className="sample-error"><AlertCircle size={17} />{error}</div>}<div className="sample-examples"><span>Examples:</span>{examples.map((sample) => <button key={sample} type="button" onClick={() => { setId(sample); setError(""); }}>{sample}</button>)}</div></section>
    <section className="sample-feature-grid" aria-label="Sample browser capabilities"><article><div className="sample-feature-icon teal"><Dna size={20} /></div><h3>Variant profile</h3><p>Review consequences, impacts, and genes for the selected sample.</p></article><article><div className="sample-feature-icon blue"><ChartNoAxesCombined size={20} /></div><h3>Dataset comparison</h3><p>Switch between independently filtered Somatic and Germline results.</p></article><article><div className="sample-feature-icon purple"><UsersRound size={20} /></div><h3>Cohort context</h3><p>Keep disease and cohort information visible alongside every sample view.</p></article></section>
  </main>;
}
