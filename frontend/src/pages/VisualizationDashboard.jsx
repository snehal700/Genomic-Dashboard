import React, { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Database, Users, Hash, Dna } from "lucide-react";
import "./VisualizationDashboard.css";
import PageNavigation from "../components/PageNavigation";

const COLORS = ["#14b8a6", "#6366f1", "#f97316", "#ec4899", "#0ea5e9", "#84cc16", "#a855f7", "#64748b"];

export default function VisualizationDashboard({ data, datasetName, isSomatic, entity, entityType }) {
  const summary = data.summary || {};
  const cohort = useMemo(() => {
    const known = ["CON", "COT", "CS", "CTN"];
    const mapped = new Map((data.cohort || []).map(item => [item.name, item]));
    return known.map(name => mapped.get(name) || { name, count: 0, samples: 0 });
  }, [data.cohort]);
  const classification = isSomatic ? (data.amp || []) : (data.acmg || []);
  const classificationTitle = isSomatic ? "AMP Category" : "ACMG Classification";

  return <main className="viz-dashboard">
    <header className="viz-hero">
      <div className="viz-hero-copy"><div className="viz-kicker"><span className={isSomatic ? "viz-dot somatic" : "viz-dot"}/>{datasetName} analysis</div><div className="viz-heading"><div className="viz-heading-icon"><Dna size={28}/></div><div><h1>{entity}</h1><p>{entityType} variation profile · {datasetName.toLowerCase()} dataset</p></div></div></div>
      <PageNavigation />
    </header>
    <section className="viz-metrics">
        <Metric icon={<Database/>} label="Total variants" value={summary.total_variants}/><Metric icon={<Users/>} label="Samples affected" value={summary.samples_affected}/><Metric icon={<Hash/>} label="Unique rsIDs" value={summary.unique_rsids}/>
    </section>
    <section className="viz-grid"><Panel title="Consequence" subtitle="Annotated functional consequences"><BarDistribution data={data.consequence} color="#10a893" /></Panel><Panel title="Exon" subtitle="Exon number / total cells"><LineDistribution data={data.exon} xKey="exon" color="#5b4bd8" /></Panel></section>
    <section className="viz-grid"><Panel title="Intron" subtitle="Intron number / total cells"><BarDistribution data={data.intron} xKey="intron" color="#2581c4" /></Panel><Panel title="CLIN_SIG" subtitle="Clinical significance annotations"><CompactDonut data={data.clin_sig} /></Panel></section>
    <section className="viz-grid"><Panel title={classificationTitle} subtitle={isSomatic ? "Somatic AMP clinical actionability" : "Germline ACMG interpretation"}><CompactDonut data={classification} /></Panel><Panel title="Cohort-wise summary" subtitle="Variant quantity across CON, COT, CS and CTN"><BarDistribution data={cohort} color="#0d8f80" /></Panel></section>
    <section className="viz-cohort-strip">{cohort.map((item, index) => <div key={item.name} className="viz-cohort"><span style={{background: COLORS[index]}} /><div><b>{item.name}</b><small>{Number(item.samples || 0).toLocaleString()} samples</small></div><strong>{Number(item.count || 0).toLocaleString()}<small> variants</small></strong></div>)}</section>
  </main>;
}

function Metric({ icon, label, value }) { return <div className="viz-metric"><i>{icon}</i><div><small>{label}</small><strong>{Number(value || 0).toLocaleString()}</strong></div></div>; }
function Panel({ title, subtitle, children, wide }) { return <article className={`viz-panel ${wide ? "wide" : ""}`}><div className="viz-panel-title"><div><h3>{title}</h3><p>{subtitle}</p></div><Activity size={18}/></div>{children}</article>; }
function Empty() { return <div className="viz-empty">No annotated data available</div>; }
function BarDistribution({ data, xKey = "name", color }) { if (!data?.length) return <Empty/>; return <ResponsiveContainer width="100%" height={245}><BarChart data={data} margin={{top: 8,right: 10,left: -16,bottom: 28}}><CartesianGrid stroke="#e8eef5" strokeDasharray="3 3" vertical={false}/><XAxis dataKey={xKey} interval={0} angle={data.length > 5 ? -28 : 0} textAnchor={data.length > 5 ? "end" : "middle"} tick={{fontSize:11,fill:"#64748b"}}/><YAxis allowDecimals={false} tick={{fontSize:11,fill:"#64748b"}}/><Tooltip/><Bar dataKey="count" fill={color} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>; }
function LineDistribution({ data, xKey, color }) { if (!data?.length) return <Empty/>; return <ResponsiveContainer width="100%" height={245}><LineChart data={data} margin={{top: 8,right: 10,left: -16,bottom: 28}}><CartesianGrid stroke="#e8eef5" strokeDasharray="3 3" vertical={false}/><XAxis dataKey={xKey} interval={0} angle={data.length > 5 ? -28 : 0} textAnchor={data.length > 5 ? "end" : "middle"} tick={{fontSize:11,fill:"#64748b"}}/><YAxis allowDecimals={false} tick={{fontSize:11,fill:"#64748b"}}/><Tooltip/><Line type="monotone" dataKey="count" stroke={color} strokeWidth={3} dot={{r:4,fill:color}}/></LineChart></ResponsiveContainer>; }
function CompactDonut({ data }) { if (!data?.length) return <Empty/>; const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0); return <div className="viz-donut"><ResponsiveContainer width="52%" height={220}><PieChart><Pie data={data} dataKey="count" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2}>{data.map((item,index)=><Cell key={`${item.name}-${index}`} fill={COLORS[index % COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="viz-legend">{data.slice(0,5).map((item,index)=><div key={`${item.name}-${index}`}><span style={{background:COLORS[index % COLORS.length]}} /><b>{item.name || "Unspecified"}</b><strong>{Number(item.count).toLocaleString()}</strong></div>)}<small>{total.toLocaleString()} total variants</small></div></div>; }
