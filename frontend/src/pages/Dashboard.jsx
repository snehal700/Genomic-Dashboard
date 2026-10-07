import React, { useEffect, useRef, useState } from "react";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
} from "recharts";

import {
    Users,
    Database,
    Dna,
    Network,
    Search,
    ArrowRight,
    Stethoscope,
    BarChart3,
    Loader2,
    AlertCircle,
    GitBranch,
    FileSpreadsheet,
    Upload,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "./Dashboard.css";


const API_BASE_URL = "http://127.0.0.1:8000";


const COLORS = [
    "#13a68b",
    "#6250d8",
    "#f39c12",
    "#e85d75",
    "#2878b8",
    "#7c61c9",
];


function formatNumber(value) {
    return Number(value || 0).toLocaleString();
}


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
    icon: Icon,
    label,
    value,
    description,
    color,
}) {
    return (
        <div className="dashboard-stat-card">

            <div
                className="dashboard-stat-icon"
                style={{
                    background: `${color}18`,
                    color: color,
                }}
            >
                <Icon size={22} />
            </div>

            <div className="dashboard-stat-content">

                <span>
                    {label}
                </span>

                <strong>
                    {value}
                </strong>

                <small>
                    {description}
                </small>

            </div>

        </div>
    );
}


/* =========================================================
   QUICK LINK
========================================================= */

function QuickLink({
    icon: Icon,
    title,
    description,
    onClick,
}) {
    return (
        <button
            className="dashboard-quick-link"
            onClick={onClick}
        >

            <div className="dashboard-quick-icon">
                <Icon size={20} />
            </div>

            <div className="dashboard-quick-content">

                <strong>
                    {title}
                </strong>

                <span>
                    {description}
                </span>

            </div>

            <ArrowRight
                size={18}
                className="dashboard-quick-arrow"
            />

        </button>
    );
}


/* =========================================================
   CHART CARD
========================================================= */

function ChartCard({
    title,
    subtitle,
    children,
    className = "",
}) {
    return (
        <section
            className={
                `dashboard-chart-card ${className}`
            }
        >

            <div className="dashboard-chart-header">

                <h2>
                    {title}
                </h2>

                <p>
                    {subtitle}
                </p>

            </div>

            <div className="dashboard-chart-body">
                {children}
            </div>

        </section>
    );
}


/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard() {

    const navigate = useNavigate();

    const [data, setData] = useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState(null);

    const [refreshKey, setRefreshKey] = useState(0);
    const [uploadForm, setUploadForm] = useState({ patientId: "", cohort: "", resultType: "Somatic", diagnosis: "", file: null });
    const [uploadStatus, setUploadStatus] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);


    /* =====================================================
       LOAD DATABASE DATA
    ===================================================== */

    useEffect(() => {

        async function loadDashboard() {

            try {

                setLoading(true);
                setError(null);

                const response =
                    await fetch(
                        `${API_BASE_URL}/api/dashboard`
                    );

                if (!response.ok) {
                    throw new Error(
                        "Unable to load dashboard data"
                    );
                }

                const result =
                    await response.json();

                setData(result);

            } catch (err) {

                console.error(
                    "Dashboard error:",
                    err
                );

                setError(
                    err.message ||
                    "Unable to load dashboard data"
                );

            } finally {

                setLoading(false);

            }
        }


        loadDashboard();

    }, [refreshKey]);


    /* =====================================================
       LOADING
    ===================================================== */

    if (loading) {

        return (
            <div className="dashboard-state">

                <Loader2
                    size={35}
                    className="dashboard-spinner"
                />

                <h2>
                    Loading genomic database...
                </h2>

                <p>
                    Calculating dashboard statistics.
                </p>

            </div>
        );
    }


    /* =====================================================
       ERROR
    ===================================================== */

    if (error) {

        return (
            <div className="dashboard-state">

                <div className="dashboard-error-icon">
                    <AlertCircle size={30} />
                </div>

                <h2>
                    Could not load dashboard
                </h2>

                <p>
                    {error}
                </p>

                <p className="dashboard-error-help">

                    Make sure FastAPI is running:

                    <br />

                    <code>
                        python -m uvicorn main:app --reload
                    </code>

                </p>

            </div>
        );
    }


    if (!data) {
        return null;
    }


    /* =====================================================
       DATA
    ===================================================== */

    const summary =
        data.summary || {};

    const cohortData =
        data.cohort_distribution || [];

    const resultTypeData =
        data.result_type || [];

    const cohortSummary =
        data.cohort_summary || [];

    const topGenes =
        data.top_genes || [];


    /*
     * IMPORTANT:
     *
     * cohort_distribution:
     *     cohort + samples
     *
     * cohort_summary:
     *     cohort + samples + variants + somatic + germline + genes
     *
     * Therefore the Variant Frequency chart
     * must use cohortSummary.
     */


    /* =====================================================
       SOMATIC / GERMLINE TOTAL
    ===================================================== */

    const resultTypeTotal =
        resultTypeData.reduce(
            (sum, item) =>
                sum + Number(item.count || 0),
            0
        );

    async function submitExcelUpdate(event) {
        event.preventDefault();
        setUploadStatus(null);
        if (!uploadForm.patientId.trim() || !uploadForm.cohort || !uploadForm.file) {
            setUploadStatus({ type: "error", message: "Patient ID, cohort, and an Excel file are required." });
            return;
        }
        const formData = new FormData();
        formData.append("patient_id", uploadForm.patientId.trim());
        formData.append("cohort", uploadForm.cohort);
        formData.append("result_type", uploadForm.resultType);
        formData.append("diagnosis", uploadForm.diagnosis.trim());
        formData.append("file", uploadForm.file);
        try {
            setUploading(true);
            const response = await fetch(`${API_BASE_URL}/api/upload-excel`, { method: "POST", body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || "Unable to import the Excel file");
            setUploadStatus({ type: "success", message: `${result.variants_imported.toLocaleString()} variants imported for ${result.patient_id}.` });
            setUploadForm({ patientId: "", cohort: "", resultType: "Somatic", diagnosis: "", file: null });
            if (fileInputRef.current) fileInputRef.current.value = "";
            setRefreshKey((value) => value + 1);
        } catch (uploadError) {
            setUploadStatus({ type: "error", message: uploadError.message || "Unable to import the Excel file" });
        } finally {
            setUploading(false);
        }
    }


    /* =====================================================
       MAIN UI
    ===================================================== */

    return (

        <div className="dashboard-page">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="dashboard-header">

                <div>

                    <h1>
                        Genomic Variation Dashboard
                    </h1>

                    <p>
                        Explore genomic variation across
                        cohorts and cancer types
                    </p>

                </div>

            </div>


            {/* =================================================
                STAT CARDS
            ================================================= */}

            <div className="dashboard-stat-grid">

                <StatCard
                    icon={Users}
                    label="Total Samples"
                    value={formatNumber(
                        summary.total_samples
                    )}
                    description="Across all cohorts"
                    color="#13a68b"
                />


                <StatCard
                    icon={Database}
                    label="Total Variants"
                    value={formatNumber(
                        summary.total_variants
                    )}
                    description="Annotated variants"
                    color="#6250d8"
                />


                <StatCard
                    icon={Dna}
                    label="Genes"
                    value={formatNumber(
                        summary.total_genes
                    )}
                    description="Unique genes"
                    color="#2878b8"
                />


                <StatCard
                    icon={Network}
                    label="Cohorts"
                    value={formatNumber(
                        summary.total_cohorts
                    )}
                    description="Available cohorts"
                    color="#e58b19"
                />


                <StatCard
                    icon={Stethoscope}
                    label="Diseases"
                    value={formatNumber(summary.disease_count || 0)}
                    description="Distinct diseases"
                    color="#d6537c"
                />

            </div>


            {/* =================================================
                MAIN CHART GRID
            ================================================= */}

            <div className="dashboard-main-grid">


                {/* =================================================
                    COHORT OVERVIEW
                ================================================= */}

                <ChartCard
                    title="Cohort Overview"
                    subtitle="Variant distribution across cohorts"
                    className="dashboard-large-card"
                >

                    {cohortData.length === 0 ? (

                        <div className="dashboard-empty">
                            No cohort data available
                        </div>

                    ) : (

                        <div className="dashboard-donut-layout">


                            <div className="dashboard-donut">

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >

                                    <PieChart>

                                        <Pie
                                            data={cohortData}
                                            dataKey="samples"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={110}
                                            paddingAngle={3}
                                        >

                                            {cohortData.map(
                                                (item, index) => (

                                                    <Cell
                                                        key={
                                                            item.name ||
                                                            index
                                                        }
                                                        fill={
                                                            COLORS[
                                                                index %
                                                                COLORS.length
                                                            ]
                                                        }
                                                    />

                                                )
                                            )}

                                        </Pie>

                                        <Tooltip />

                                    </PieChart>

                                </ResponsiveContainer>


                                <div className="dashboard-donut-center">

                                    <strong>
                                        {formatNumber(
                                            summary.total_samples
                                        )}
                                    </strong>

                                    <span>
                                        Samples
                                    </span>

                                </div>

                            </div>


                            <div className="dashboard-cohort-legend">

                                {cohortData.map(
                                    (item, index) => (

                                        <div
                                            className="dashboard-legend-item"
                                            key={
                                                item.name ||
                                                index
                                            }
                                        >

                                            <div>

                                                <span
                                                    className="dashboard-legend-dot"
                                                    style={{
                                                        background:
                                                            COLORS[
                                                                index %
                                                                COLORS.length
                                                            ],
                                                    }}
                                                />

                                                <strong>
                                                    {item.name}
                                                </strong>

                                            </div>

                                            <span>
                                                {
                                                    formatNumber(
                                                        item.samples
                                                    )
                                                }
                                            </span>

                                        </div>

                                    )
                                )}

                            </div>

                        </div>

                    )}

                </ChartCard>


                {/* =================================================
                    VARIANT FREQUENCY ACROSS COHORTS
                ================================================= */}

                <ChartCard
                    title="Variant Frequency Across Cohorts"
                    subtitle="Relative variant distribution"
                >

                    {cohortSummary.length === 0 ? (

                        <div className="dashboard-empty">
                            No cohort variant data available
                        </div>

                    ) : (

                        <ResponsiveContainer
                            width="100%"
                            height={300}
                        >

                            <BarChart
                                data={cohortSummary}
                                margin={{
                                    top: 20,
                                    right: 15,
                                    left: 5,
                                    bottom: 20,
                                }}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#e4eaf0"
                                />

                                <XAxis
                                    dataKey="cohort"
                                    tick={{
                                        fontSize: 11,
                                        fill: "#64748b",
                                    }}
                                />

                                <YAxis
                                    allowDecimals={false}
                                    tick={{
                                        fontSize: 11,
                                        fill: "#64748b",
                                    }}
                                />

                                <Tooltip />

                                <Bar
                                    dataKey="variants"
                                    name="Variants"
                                    fill="#6250d8"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0,
                                    ]}
                                />

                            </BarChart>

                        </ResponsiveContainer>

                    )}

                </ChartCard>


                {/* =================================================
                    SOMATIC VS GERMLINE
                ================================================= */}

                <ChartCard
                    title="Somatic vs Germline"
                    subtitle="Overall variant composition"
                >

                    {resultTypeData.length === 0 ||
                    resultTypeTotal === 0 ? (

                        <div className="dashboard-empty">
                            No result type data
                        </div>

                    ) : (

                        <div className="dashboard-result-layout">


                            {/* DONUT */}

                            <div
                                className="dashboard-result-donut"
                                style={{
                                    width: "230px",
                                    height: "230px",
                                    minWidth: "230px",
                                    flexShrink: 0,
                                }}
                            >

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >

                                    <PieChart>

                                        <Pie
                                            data={resultTypeData}
                                            dataKey="count"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={95}
                                            paddingAngle={3}
                                        >

                                            {resultTypeData.map(
                                                (item, index) => (

                                                    <Cell
                                                        key={
                                                            item.name ||
                                                            index
                                                        }
                                                        fill={
                                                            item.name ===
                                                            "Somatic"
                                                                ? "#13a68b"
                                                                : "#275a73"
                                                        }
                                                    />

                                                )
                                            )}

                                        </Pie>

                                        <Tooltip />

                                    </PieChart>

                                </ResponsiveContainer>

                            </div>


                            {/* LEGEND */}

                            <div className="dashboard-result-legend">

                                {resultTypeData.map(
                                    (item) => {

                                        const count =
                                            Number(
                                                item.count || 0
                                            );

                                        const percentage =
                                            resultTypeTotal > 0
                                                ? (
                                                    (count /
                                                        resultTypeTotal) *
                                                    100
                                                ).toFixed(1)
                                                : "0.0";

                                        return (

                                            <div
                                                className="dashboard-result-row"
                                                key={item.name}
                                            >

                                                <div>

                                                    <span
                                                        className="dashboard-legend-dot"
                                                        style={{
                                                            background:
                                                                item.name ===
                                                                "Somatic"
                                                                    ? "#13a68b"
                                                                    : "#275a73",
                                                        }}
                                                    />

                                                    {item.name}

                                                </div>


                                                <strong>
                                                    {percentage}%
                                                </strong>

                                            </div>

                                        );

                                    }
                                )}

                            </div>

                        </div>

                    )}

                </ChartCard>

            </div>


            {/* =================================================
                QUICK LINKS
            ================================================= */}

            <section className="dashboard-section">

                <div className="dashboard-section-heading">

                    <div>

                        <h2>
                            Quick Links
                        </h2>

                        <p>
                            Explore the genomic database
                        </p>

                    </div>

                </div>


                <div className="dashboard-quick-grid">


                    <QuickLink
                        icon={Search}
                        title="Gene Browser"
                        description="Search genes and view genomic variation"
                        onClick={() =>
                            navigate("/genes")
                        }
                    />


                    <QuickLink
                        icon={Dna}
                        title="RSID Browser"
                        description="Search variants by RSID"
                        onClick={() =>
                            navigate("/rsids")
                        }
                    />


                    <QuickLink
                        icon={Users}
                        title="Sample Browser"
                        description="Explore genomic samples"
                        onClick={() =>
                            navigate("/samples")
                        }
                    />


                    <QuickLink
                        icon={GitBranch}
                        title="Cohort Comparison"
                        description="Compare genomic cohorts"
                        onClick={() =>
                            navigate("/cohorts")
                        }
                    />


                    <QuickLink
                        icon={Stethoscope}
                        title="Gene Panel"
                        description="Browse curated clinical gene panels"
                        onClick={() =>
                            navigate("/gene-panel")
                        }
                    />


                    <QuickLink
                        icon={BarChart3}
                        title="Analytics"
                        description="Advanced genomic statistics"
                        onClick={() =>
                            navigate("/analytics")
                        }
                    />

                </div>

            </section>


            {/* =================================================
                COHORT TABLE
            ================================================= */}

            <section className="dashboard-table-card">

                <div className="dashboard-section-heading">

                    <div>

                        <h2>
                            Cohort Summary Statistics
                        </h2>

                        <p>
                            Statistics calculated from the
                            genomic database
                        </p>

                    </div>

                </div>


                <div className="dashboard-table-wrapper">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Cohort
                                </th>

                                <th>
                                    Samples
                                </th>

                                <th>
                                    Total Variants
                                </th>

                                <th>
                                    Somatic
                                </th>

                                <th>
                                    Germline
                                </th>

                                <th>
                                    Unique Genes
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {cohortSummary.map(
                                (row) => (

                                    <tr
                                        key={
                                            row.cohort
                                        }
                                    >

                                        <td>
                                            <strong>
                                                {row.cohort}
                                            </strong>
                                        </td>

                                        <td>
                                            {formatNumber(
                                                row.samples
                                            )}
                                        </td>

                                        <td>
                                            {formatNumber(
                                                row.variants
                                            )}
                                        </td>

                                        <td>
                                            {formatNumber(
                                                row.somatic
                                            )}
                                        </td>

                                        <td>
                                            {formatNumber(
                                                row.germline
                                            )}
                                        </td>

                                        <td>
                                            {formatNumber(
                                                row.genes
                                            )}
                                        </td>

                                    </tr>

                                )
                            )}

                        </tbody>

                    </table>

                </div>

            </section>


            {/* =================================================
                TOP GENES
            ================================================= */}

            <section className="dashboard-table-card">

                <div className="dashboard-section-heading">

                    <div>

                        <h2>
                            Top Genes by Variant Count
                        </h2>

                        <p>
                            Most frequently observed genes
                        </p>

                    </div>

                </div>


                <div className="dashboard-top-gene-list">

                    {topGenes.map(
                        (item, index) => (

                            <button
                                key={
                                    item.gene
                                }
                                className="dashboard-top-gene"
                                onClick={() =>
                                    navigate(
                                        `/genes/${encodeURIComponent(
                                            item.gene
                                        )}`
                                    )
                                }
                            >

                                <span className="dashboard-gene-rank">
                                    {index + 1}
                                </span>

                                <span className="dashboard-gene-name">
                                    {item.gene}
                                </span>

                                <span className="dashboard-gene-count">
                                    {formatNumber(
                                        item.variants
                                    )}
                                    {" "}
                                    variants
                                </span>

                                <ArrowRight size={15} />

                            </button>

                        )
                    )}

                </div>

            </section>


            {/* =================================================
                DATABASE STATUS
            ================================================= */}

            <div className="dashboard-database-status">

                <div className="dashboard-status-left">

                    <div className="dashboard-status-icon">
                        <Database size={17} />
                    </div>

                    <div>

                        <strong>
                            Live Database
                        </strong>

                        <span>
                            Statistics are loaded directly
                            from MariaDB
                        </span>

                    </div>

                </div>


                <div className="dashboard-connected">

                    <span />

                    Connected

                </div>

            </div>

            <section className="dashboard-table-card dashboard-upload-card">
                <div className="dashboard-section-heading">
                    <div>
                        <h2>Update Genomic Database</h2>
                        <p>Import an Excel variant file into MariaDB</p>
                    </div>
                    <div className="dashboard-upload-icon"><FileSpreadsheet size={20} /></div>
                </div>
                <form className="dashboard-upload-form" onSubmit={submitExcelUpdate}>
                    <label>Patient ID<input value={uploadForm.patientId} onChange={(event) => setUploadForm({ ...uploadForm, patientId: event.target.value })} placeholder="e.g. 5A0155" required /></label>
                    <label>Cohort<select value={uploadForm.cohort} onChange={(event) => setUploadForm({ ...uploadForm, cohort: event.target.value })} required><option value="">Select cohort</option><option value="CON">CON</option><option value="COT">COT</option><option value="CS">CS</option><option value="CTN">CTN</option></select></label>
                    <label>Variant set<select value={uploadForm.resultType} onChange={(event) => setUploadForm({ ...uploadForm, resultType: event.target.value })} required><option value="Somatic">Somatic</option><option value="Germline">Germline</option></select></label>
                    <label><span className="dashboard-upload-label">Diagnosis <em>(Optional)</em></span><input value={uploadForm.diagnosis} onChange={(event) => setUploadForm({ ...uploadForm, diagnosis: event.target.value })} placeholder="Add diagnosis if available" /></label>
                    <label className="dashboard-upload-file">Excel file
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={(event) => setUploadForm({ ...uploadForm, file: event.target.files?.[0] || null })} required />
                        <span className="dashboard-upload-file-picker"><span>Choose Excel file</span><strong>{uploadForm.file ? uploadForm.file.name : "No file selected"}</strong></span>
                    </label>
                    <button type="submit" className="dashboard-upload-button" disabled={uploading}>{uploading ? <Loader2 size={16} className="dashboard-spinner" /> : <Upload size={16} />}{uploading ? "Importing..." : "Import Excel"}</button>
                </form>
                {uploadStatus && <p className={`dashboard-upload-message ${uploadStatus.type}`}>{uploadStatus.message}</p>}
            </section>


        </div>
    );
}


export default Dashboard;
