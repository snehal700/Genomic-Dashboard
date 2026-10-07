import { GitCompareArrows } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageNavigation from "../components/PageNavigation";
import "./CohortComparison.css";

const comparisons = [["CON", "COT"], ["CON", "CTN"], ["CON", "CS"], ["COT", "CTN"], ["COT", "CS"], ["CTN", "CS"]];
export default function CohortComparison() {
  const navigate = useNavigate();
  return <main className="cohort-page"><header className="cohort-header"><div><div className="cohort-crumb">Genomic Portal <span>/</span> Cohort Comparison</div><div className="cohort-title"><div><GitCompareArrows size={27} /></div><section><h1>Cohort Comparison</h1><p>Compare genomic variation across two study cohorts</p></section></div></div><PageNavigation /></header><section className="cohort-intro"><h2>Select cohorts to compare</h2><p>Review sample-level genomic differences, shared findings, functional composition, and chromosome distribution.</p></section><section className="cohort-card-grid">{comparisons.map(([left, right]) => <button className="cohort-choice-card" key={`${left}-${right}`} onClick={() => navigate(`/cohorts/${left.toLowerCase()}-vs-${right.toLowerCase()}`)}><div className={`cohort-token ${left.toLowerCase()}`}>{left}</div><GitCompareArrows size={19} /><div className={`cohort-token ${right.toLowerCase()}`}>{right}</div><span>Compare cohorts</span></button>)}</section></main>;
}
