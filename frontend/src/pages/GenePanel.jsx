import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Dna, Loader2, Search } from "lucide-react";
import PageNavigation from "../components/PageNavigation";
import "./GenePanel.css";

const API_URL = "http://127.0.0.1:8000";

function GenePanel() {
    const navigate = useNavigate();
    const [panels, setPanels] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedPanel, setSelectedPanel] = useState(null);
    const [loadingPanels, setLoadingPanels] = useState(true);
    const [loadingGenes, setLoadingGenes] = useState(false);
    const [error, setError] = useState("");
    const [geneQuery, setGeneQuery] = useState("");

    useEffect(() => {
        async function loadPanels() {
            try {
                const response = await fetch(`${API_URL}/api/gene-panels`);
                if (!response.ok) throw new Error("Unable to load gene panels.");
                const result = await response.json();
                const availablePanels = result.panels || [];
                setPanels(availablePanels);
                if (availablePanels.length) setSelectedId(availablePanels[0].id);
            } catch (loadError) {
                setError(loadError.message || "Unable to load gene panels.");
            } finally {
                setLoadingPanels(false);
            }
        }
        loadPanels();
    }, []);

    useEffect(() => {
        if (selectedId === null) return;
        async function loadSelectedPanel() {
            try {
                setLoadingGenes(true);
                setError("");
                const response = await fetch(`${API_URL}/api/gene-panels/${selectedId}`);
                if (!response.ok) throw new Error("Unable to load this gene panel.");
                setSelectedPanel(await response.json());
                setGeneQuery("");
            } catch (loadError) {
                setError(loadError.message || "Unable to load this gene panel.");
            } finally {
                setLoadingGenes(false);
            }
        }
        loadSelectedPanel();
    }, [selectedId]);

    if (loadingPanels) {
        return <div className="gene-panel-state"><Loader2 className="gene-panel-spin" size={30} /> Loading gene panels…</div>;
    }

    if (error && !selectedPanel) {
        return <div className="gene-panel-state gene-panel-error"><AlertCircle size={32} /><h2>Gene panels unavailable</h2><p>{error}</p><PageNavigation /></div>;
    }

    return <main className="gene-panel-page">
        <header className="gene-panel-header">
            <div>
                <div className="gene-panel-breadcrumb">Genomic Portal <span>/</span> Gene Panel</div>
                <div className="gene-panel-title"><div className="gene-panel-title-icon"><Dna size={25} /></div><div><h1>Gene Panel</h1><p>Browse genes by clinical and genomic panel</p></div></div>
            </div>
            <PageNavigation />
        </header>

        <section className="gene-panel-selector-card">
            <div className="gene-panel-section-heading"><div><h2>Choose a panel</h2><p>Panel categories are loaded directly from the supplied gene list.</p></div><span>{panels.length} panels</span></div>
            <div className="gene-panel-tabs">
                {panels.map((panel) => <button key={panel.id} className={panel.id === selectedId ? "active" : ""} onClick={() => setSelectedId(panel.id)}>{panel.name}<small>{panel.gene_count.toLocaleString()}</small></button>)}
            </div>
        </section>

        <section className="gene-panel-results">
            <div className="gene-panel-results-heading"><div><span>Selected panel</span><h2>{selectedPanel?.name || "Loading…"}</h2></div><div className="gene-panel-count"><strong>{(selectedPanel?.genes || []).length.toLocaleString()}</strong><span>Total genes</span></div></div>
            {error && <div className="gene-panel-inline-error"><AlertCircle size={16} /> {error}</div>}
            <div className="gene-panel-search"><Search size={18} /><input value={geneQuery} onChange={(event) => setGeneQuery(event.target.value)} placeholder="Search genes in this panel" aria-label="Search genes in selected panel" /></div>
            {loadingGenes ? <div className="gene-panel-list-loading"><Loader2 className="gene-panel-spin" size={24} /> Loading genes…</div> : <div className="gene-panel-grid">
                {(selectedPanel?.genes || []).filter((gene) => gene.toLowerCase().includes(geneQuery.trim().toLowerCase())).map((gene, index) => <button key={`${gene}-${index}`} className="gene-panel-gene-card" onClick={() => navigate(`/genes/${encodeURIComponent(gene)}`)} aria-label={`View ${gene}`}><Dna size={17} /><span>{gene}</span><ArrowRight size={17} /></button>)}
            </div>}
        </section>
    </main>;
}

export default GenePanel;
