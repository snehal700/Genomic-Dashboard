import React, {
    useEffect,
    useState
} from "react";

import {
    useNavigate,
    useParams
} from "react-router-dom";

import {
    ArrowLeft,
    Dna,
    Database,
    Users,
    Hash,
    Loader2,
    AlertCircle
} from "lucide-react";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from "recharts";

import "./GeneVisualization.css";
import VisualizationDashboard from "./VisualizationDashboard";


const API_URL =
    "http://127.0.0.1:8000";


const COLORS = [
    "#11a88f",
    "#275a73",
    "#5b4bd8",
    "#ef5b73",
    "#f39a0b",
    "#8a94a6",
    "#4c8bf5",
    "#9b59b6"
];


/* ============================================================
   GENE VISUALIZATION
============================================================ */

function GeneVisualization() {

    const {
        gene,
        dataset
    } = useParams();

    const navigate =
        useNavigate();


    const [
        data,
        setData
    ] = useState(null);


    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        error,
        setError
    ] = useState("");


    /* ========================================================
       DATASET
    ======================================================== */

    const normalizedDataset =
        dataset?.toLowerCase();


    const isSomatic =
        normalizedDataset === "somatic";


    const isGermline =
        normalizedDataset === "germline";


    const datasetName =
        isGermline
            ? "Germline"
            : "Somatic";


    /* ========================================================
       LOAD VISUALIZATION DATA
    ======================================================== */

    useEffect(() => {

        async function loadVisualizations() {

            try {

                setLoading(true);
                setError("");
                setData(null);


                /*
                 * Only Somatic and Germline
                 * are valid datasets.
                 */

                if (
                    !isSomatic &&
                    !isGermline
                ) {

                    throw new Error(
                        "Invalid dataset. Use somatic or germline."
                    );

                }


                if (!gene) {

                    throw new Error(
                        "Gene name is missing."
                    );

                }


                /*
                 * IMPORTANT:
                 *
                 * FastAPI expects:
                 *
                 * result_type=Somatic
                 *
                 * OR
                 *
                 * result_type=Germline
                 */

                const response =
                    await fetch(
                        `${API_URL}/api/gene/${encodeURIComponent(
                            gene
                        )}/visualizations?result_type=${datasetName}`
                    );


                if (!response.ok) {

                    let message =
                        "Unable to load visualization data";


                    try {

                        const errorData =
                            await response.json();

                        if (
                            errorData.detail
                        ) {

                            message =
                                errorData.detail;

                        }

                    } catch {
                        // Keep default message
                    }


                    throw new Error(
                        message
                    );

                }


                const result =
                    await response.json();


                setData(result);

            } catch (err) {

                console.error(
                    "Visualization error:",
                    err
                );


                setError(
                    err.message ||
                    "Unable to connect to backend"
                );

            } finally {

                setLoading(false);

            }

        }


        loadVisualizations();

    }, [
        gene,
        dataset,
        datasetName,
        isSomatic,
        isGermline
    ]);


    /* ========================================================
       LOADING
    ======================================================== */

    if (loading) {

        return (
            <div className="visual-loading">

                <Loader2
                    size={34}
                    className="spin"
                />

                <span>
                    Loading{" "}
                    {datasetName.toLowerCase()}
                    {" "}
                    data...
                </span>

            </div>
        );

    }


    /* ========================================================
       ERROR
    ======================================================== */

    if (error) {

        return (
            <div className="visual-error">

                <AlertCircle
                    size={35}
                />

                <h2>
                    Unable to load visualization
                </h2>

                <p>
                    {error}
                </p>

                <button
                    onClick={() =>
                        navigate(
                            `/genes/${encodeURIComponent(
                                gene
                            )}`
                        )
                    }
                >

                    <ArrowLeft
                        size={17}
                    />

                    Back to Gene

                </button>

            </div>
        );

    }


    /* ========================================================
       NO DATA
    ======================================================== */

    if (!data) {

        return (
            <div className="visual-error">

                <AlertCircle
                    size={35}
                />

                <h2>
                    No data available
                </h2>

                <button
                    onClick={() =>
                        navigate(
                            `/genes/${encodeURIComponent(
                                gene
                            )}`
                        )
                    }
                >

                    <ArrowLeft
                        size={17}
                    />

                    Back to Gene

                </button>

            </div>
        );

    }


    /* ========================================================
       DATA
    ======================================================== */

    const summary =
        data.summary || {};


    const consequence =
        data.consequence || [];


    const exon =
        data.exon || [];


    const intron =
        data.intron || [];


    const clinSig =
        data.clin_sig || [];


    const chromosome =
        data.chromosome || [];


    const acmg =
        data.acmg || [];


    /* ========================================================
       MAIN UI
    ======================================================== */

    return <VisualizationDashboard
        data={data}
        datasetName={datasetName}
        isSomatic={isSomatic}
        entity={gene}
        entityType="Gene"
        onBack={() => navigate(`/genes/${encodeURIComponent(gene)}`)}
    />;

    return (

        <div className="visual-page">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="visual-top">

                <div>


                    {/* BREADCRUMB */}

                    <div className="visual-breadcrumb">

                        <button
                            onClick={() =>
                                navigate("/genes")
                            }
                        >
                            Gene Browser
                        </button>

                        <span>
                            /
                        </span>

                        <button
                            onClick={() =>
                                navigate(
                                    `/genes/${encodeURIComponent(
                                        gene
                                    )}`
                                )
                            }
                        >
                            {gene}
                        </button>

                        <span>
                            /
                        </span>

                        <span>
                            {datasetName}
                        </span>

                    </div>


                    {/* TITLE */}

                    <div className="visual-title">

                        <div className="visual-title-icon">

                            <Dna
                                size={34}
                            />

                        </div>


                        <div>

                            <h1>
                                {gene}
                            </h1>

                            <p>
                                {datasetName}
                                {" "}
                                variant visualizations
                            </p>

                        </div>

                    </div>

                </div>


                {/* BACK BUTTON */}

                <button
                    className="back-gene-button"
                    onClick={() =>
                        navigate(
                            `/genes/${encodeURIComponent(
                                gene
                            )}`
                        )
                    }
                >

                    <ArrowLeft
                        size={18}
                    />

                    Back to Gene

                </button>

            </div>


            {/* =================================================
                DATASET STATUS
            ================================================= */}

            <div
                className={
                    isSomatic
                        ? "dataset-status somatic-status"
                        : "dataset-status germline-status"
                }
            >

                <span
                    className="status-dot"
                />

                Showing{" "}

                <strong>
                    {datasetName}
                </strong>

                {" "}
                variants for{" "}

                <strong>
                    {gene}
                </strong>

            </div>


            {/* =================================================
                SUMMARY CARDS
            ================================================= */}

            <div className="visual-summary-grid">


                {/* TOTAL VARIANTS */}

                <div className="visual-summary-card">

                    <div className="visual-summary-icon">

                        <Database
                            size={24}
                        />

                    </div>

                    <div>

                        <span>
                            Total Variants
                        </span>

                        <strong>
                            {Number(
                                summary.total_variants || 0
                            ).toLocaleString()}
                        </strong>

                    </div>

                </div>


                {/* SAMPLES */}

                <div className="visual-summary-card">

                    <div className="visual-summary-icon blue">

                        <Users
                            size={24}
                        />

                    </div>

                    <div>

                        <span>
                            Samples Affected
                        </span>

                        <strong>
                            {Number(
                                summary.samples_affected || 0
                            ).toLocaleString()}
                        </strong>

                    </div>

                </div>


                {/* RSIDS */}

                <div className="visual-summary-card">

                    <div className="visual-summary-icon purple">

                        <Hash
                            size={24}
                        />

                    </div>

                    <div>

                        <span>
                            Unique rsIDs
                        </span>

                        <strong>
                            {Number(
                                summary.unique_rsids || 0
                            ).toLocaleString()}
                        </strong>

                    </div>

                </div>


                {/* DATASET */}

                <div className="visual-summary-card">

                    <div className="visual-summary-icon pink">

                        <Dna
                            size={24}
                        />

                    </div>

                    <div>

                        <span>
                            Dataset
                        </span>

                        <strong>
                            {datasetName}
                        </strong>

                    </div>

                </div>

            </div>


            {/* =================================================
                CONSEQUENCE DISTRIBUTION
            ================================================= */}

            <ChartCard
                title="Consequence Distribution"
                subtitle={
                    `Annotated variant consequences in ${datasetName.toLowerCase()} variants`
                }
                full
            >

                {consequence.length === 0 ? (

                    <div className="no-data">
                        No data available
                    </div>

                ) : (

                    <ResponsiveContainer
                        width="100%"
                        height={340}
                    >

                        <BarChart
                            data={consequence}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 10,
                                bottom: 60
                            }}
                        >

                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                            />

                            <XAxis
                                dataKey="name"
                                angle={-25}
                                textAnchor="end"
                                interval={0}
                            />

                            <YAxis />

                            <Tooltip />

                            <Bar
                                dataKey="count"
                                fill="#11a88f"
                                radius={[
                                    7,
                                    7,
                                    0,
                                    0
                                ]}
                            />

                        </BarChart>

                    </ResponsiveContainer>

                )}

            </ChartCard>


            {/* =================================================
                EXON + INTRON
            ================================================= */}

            <div className="chart-grid">


                {/* EXON */}

                <ChartCard
                    title="Exon Number vs Total Variants"
                    subtitle="Variant count across exon positions"
                >

                    {exon.length === 0 ? (

                        <div className="no-data">
                            No data available
                        </div>

                    ) : (

                        <ResponsiveContainer
                            width="100%"
                            height={320}
                        >

                            <BarChart
                                data={exon}
                                margin={{
                                    top: 20,
                                    right: 20,
                                    left: 0,
                                    bottom: 50
                                }}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="exon"
                                    angle={-35}
                                    textAnchor="end"
                                />

                                <YAxis />

                                <Tooltip />

                                <Bar
                                    dataKey="count"
                                    fill="#5b4bd8"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0
                                    ]}
                                />

                            </BarChart>

                        </ResponsiveContainer>

                    )}

                </ChartCard>


                {/* INTRON */}

                <ChartCard
                    title="Intron Number vs Total Variants"
                    subtitle="Variant count across intron positions"
                >

                    {intron.length === 0 ? (

                        <div className="no-data">
                            No data available
                        </div>

                    ) : (

                        <ResponsiveContainer
                            width="100%"
                            height={320}
                        >

                            <BarChart
                                data={intron}
                                margin={{
                                    top: 20,
                                    right: 20,
                                    left: 0,
                                    bottom: 50
                                }}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="intron"
                                    angle={-35}
                                    textAnchor="end"
                                />

                                <YAxis />

                                <Tooltip />

                                <Bar
                                    dataKey="count"
                                    fill="#275a73"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0
                                    ]}
                                />

                            </BarChart>

                        </ResponsiveContainer>

                    )}

                </ChartCard>

            </div>


            {/* =================================================
                CLINICAL SIGNIFICANCE
            ================================================= */}

            <ChartCard
                title="Clinical Significance"
                subtitle="Distribution of CLIN_SIG annotations"
            >

                <DonutChart
                    data={clinSig}
                />

            </ChartCard>


            {/* =================================================
                CHROMOSOME
            ================================================= */}

            <ChartCard
                title="Chromosome Distribution"
                subtitle="Number of variants by chromosome"
                full
            >

                {chromosome.length === 0 ? (

                    <div className="no-data">
                        No data available
                    </div>

                ) : (

                    <ResponsiveContainer
                        width="100%"
                        height={340}
                    >

                        <BarChart
                            data={chromosome}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 10,
                                bottom: 20
                            }}
                        >

                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                            />

                            <XAxis
                                dataKey="chromosome"
                            />

                            <YAxis />

                            <Tooltip />

                            <Bar
                                dataKey="count"
                                fill="#ef5b73"
                                radius={[
                                    6,
                                    6,
                                    0,
                                    0
                                ]}
                            />

                        </BarChart>

                    </ResponsiveContainer>

                )}

            </ChartCard>


            {/* =================================================
                ACMG
            ================================================= */}

            <ChartCard
                title="ACMG Classification"
                subtitle="Distribution of ACMG variant classifications"
            >

                <DonutChart
                    data={acmg}
                />

            </ChartCard>


        </div>
    );
}


/* ============================================================
   CHART CARD
============================================================ */

function ChartCard({
    title,
    subtitle,
    children,
    full = false
}) {

    return (

        <section
            className={
                full
                    ? "chart-card full-chart"
                    : "chart-card"
            }
        >

            <div className="chart-header">

                <h2>
                    {title}
                </h2>

                <p>
                    {subtitle}
                </p>

            </div>

            {children}

        </section>
    );
}


/* ============================================================
   DONUT CHART
============================================================ */

function DonutChart({
    data
}) {

    if (
        !data ||
        data.length === 0
    ) {

        return (
            <div className="no-data">
                No data available
            </div>
        );

    }


    return (

        <div className="donut-wrapper">


            <ResponsiveContainer
                width="55%"
                height={320}
            >

                <PieChart>

                    <Pie
                        data={data}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={115}
                        paddingAngle={2}
                    >

                        {data.map(
                            (item, index) => (

                                <Cell
                                    key={
                                        `${item.name}-${index}`
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


            <div className="donut-legend">

                {data.map(
                    (item, index) => (

                        <div
                            className="legend-item"
                            key={
                                `${item.name}-legend-${index}`
                            }
                        >

                            <span
                                className="legend-dot"
                                style={{
                                    background:
                                        COLORS[
                                            index %
                                            COLORS.length
                                        ]
                                }}
                            />

                            <span className="legend-name">
                                {item.name}
                            </span>

                            <strong>
                                {Number(
                                    item.count || 0
                                ).toLocaleString()}
                            </strong>

                        </div>

                    )
                )}

            </div>

        </div>
    );
}


export default GeneVisualization;
