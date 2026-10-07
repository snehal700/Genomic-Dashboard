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
    AlertCircle,
    BarChart3
} from "lucide-react";

import "./GeneDetail.css";
import PageNavigation from "../components/PageNavigation";


const API_BASE_URL =
    "http://127.0.0.1:8000";


function formatNumber(value) {
    return Number(
        value || 0
    ).toLocaleString();
}


function SummaryCard({
    icon,
    label,
    value,
    color
}) {

    return (
        <div className="gene-summary-card">

            <div
                className="gene-summary-icon"
                style={{
                    color: color,
                    background: `${color}18`
                }}
            >
                {React.createElement(icon, { size: 23 })}
            </div>

            <div className="gene-summary-content">

                <span>
                    {label}
                </span>

                <strong>
                    {formatNumber(value)}
                </strong>

            </div>

        </div>
    );
}


function DatasetCard({
    type,
    count,
    samples,
    rsids,
    color,
    onClick
}) {

    const isSomatic =
        type === "Somatic";


    return (
        <div
            className={
                `gene-dataset-card ${
                    isSomatic
                        ? "somatic-card"
                        : "germline-card"
                }`
            }
        >

            <div className="gene-dataset-header">

                <div className="gene-dataset-title">

                    <span
                        className="gene-dataset-dot"
                        style={{
                            background: color
                        }}
                    />

                    <h2>
                        {type}
                    </h2>

                </div>

            </div>


            <div className="gene-dataset-stats">

                <div>
                    <span>
                        Total Variants
                    </span>

                    <strong>
                        {formatNumber(count)}
                    </strong>
                </div>


                <div>
                    <span>
                        Samples Affected
                    </span>

                    <strong>
                        {formatNumber(samples)}
                    </strong>
                </div>


                <div>
                    <span>
                        Unique rsIDs
                    </span>

                    <strong>
                        {formatNumber(rsids)}
                    </strong>
                </div>

            </div>


            <button
                className="gene-view-button"
                onClick={onClick}
            >

                <BarChart3 size={18} />

                View {type} Visualization

            </button>

        </div>
    );
}


function GeneDetail() {

    const navigate = useNavigate();

    const {
        gene
    } = useParams();


    const decodedGene =
        decodeURIComponent(
            gene || ""
        );


    const [
        somatic,
        setSomatic
    ] = useState(null);


    const [
        germline,
        setGermline
    ] = useState(null);


    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        error,
        setError
    ] = useState("");


    useEffect(() => {

        async function loadGeneData() {

            try {

                setLoading(true);
                setError("");


                /*
                 * Load both datasets independently.
                 */

                const [
                    somaticResponse,
                    germlineResponse
                ] = await Promise.all([
                    fetch(
                        `${API_BASE_URL}/api/gene/${encodeURIComponent(
                            decodedGene
                        )}/visualizations?result_type=Somatic`
                    ),

                    fetch(
                        `${API_BASE_URL}/api/gene/${encodeURIComponent(
                            decodedGene
                        )}/visualizations?result_type=Germline`
                    )
                ]);


                /*
                 * Somatic data
                 */

                let somaticData = null;

                if (
                    somaticResponse.ok
                ) {

                    somaticData =
                        await somaticResponse.json();

                }


                /*
                 * Germline data
                 */

                let germlineData = null;

                if (
                    germlineResponse.ok
                ) {

                    germlineData =
                        await germlineResponse.json();

                }


                /*
                 * The gene must exist in at least
                 * one dataset.
                 */

                if (
                    !somaticData &&
                    !germlineData
                ) {

                    throw new Error(
                        `Gene "${decodedGene}" was not found in the database.`
                    );

                }


                setSomatic(
                    somaticData
                );

                setGermline(
                    germlineData
                );

            }
            catch (err) {

                console.error(
                    "Gene detail error:",
                    err
                );

                setError(
                    err.message ||
                    "Unable to load gene data"
                );

            }
            finally {

                setLoading(false);

            }

        }


        if (decodedGene) {

            loadGeneData();

        }

    }, [decodedGene]);


    /*
     * ============================================================
     * LOADING
     * ============================================================
     */

    if (loading) {

        return (

            <div className="gene-state">

                <Loader2
                    size={36}
                    className="gene-spinner"
                />

                <h2>
                    Loading gene data...
                </h2>

                <p>
                    Reading genomic variants from the database.
                </p>

            </div>

        );

    }


    /*
     * ============================================================
     * ERROR
     * ============================================================
     */

    if (error) {

        return (

            <div className="gene-state">

                <div className="gene-error-icon">

                    <AlertCircle
                        size={32}
                    />

                </div>

                <h2>
                    Unable to load gene
                </h2>

                <p>
                    {error}
                </p>

                <button
                    className="gene-back-button"
                    onClick={() =>
                        navigate("/genes")
                    }
                >

                    <ArrowLeft
                        size={17}
                    />

                    Back to Gene Search

                </button>

            </div>

        );

    }


    /*
     * ============================================================
     * SAFE SUMMARY DATA
     * ============================================================
     */

    const somaticSummary =
        somatic?.summary || {};

    const germlineSummary =
        germline?.summary || {};


    const somaticVariants =
        somaticSummary.total_variants || 0;

    const germlineVariants =
        germlineSummary.total_variants || 0;


    const somaticSamples =
        somaticSummary.samples_affected || 0;

    const germlineSamples =
        germlineSummary.samples_affected || 0;


    const somaticRsids =
        somaticSummary.unique_rsids || 0;

    const germlineRsids =
        germlineSummary.unique_rsids || 0;


    /*
     * Combined values
     */

    const totalVariants =
        somaticVariants +
        germlineVariants;


    const totalSamples =
        Math.max(
            somaticSamples,
            germlineSamples
        );


    const totalRsids =
        somaticRsids +
        germlineRsids;


    /*
     * ============================================================
     * MAIN PAGE
     * ============================================================
     */

    return (

        <div className="gene-detail-page">


            {/* =================================================
                BREADCRUMB
            ================================================= */}

            <div className="gene-breadcrumb">

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

                <span>
                    {decodedGene}
                </span>

            </div>


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="gene-header">

                <div className="gene-header-left">

                    <div className="gene-header-icon">

                        <Dna
                            size={28}
                        />

                    </div>


                    <div>

                        <h1>
                            {decodedGene}
                        </h1>

                        <p>
                            Genomic variation and annotation overview
                        </p>

                    </div>

                </div>


                <PageNavigation />

            </div>


            {/* =================================================
                SUMMARY
            ================================================= */}

            <div className="gene-section">

                <div className="gene-section-title">

                    <h2>
                        Variant Summary
                    </h2>

                    <p>
                        Overview of somatic and germline variation
                    </p>

                </div>


                <div className="gene-summary-grid">


                    <SummaryCard
                        icon={Database}
                        label="Total Variants"
                        value={totalVariants}
                        color="#13a68b"
                    />


                    <SummaryCard
                        icon={Users}
                        label="Samples Affected"
                        value={totalSamples}
                        color="#2878b8"
                    />


                    <SummaryCard
                        icon={Hash}
                        label="Unique rsIDs"
                        value={totalRsids}
                        color="#6250d8"
                    />


                    <SummaryCard
                        icon={Dna}
                        label="Gene"
                        value={decodedGene}
                        color="#e85d75"
                    />

                </div>

            </div>


            {/* =================================================
                DATASET SELECTION
            ================================================= */}

            <div className="gene-section">

                <div className="gene-section-title">

                    <h2>
                        Select Dataset
                    </h2>

                    <p>
                        Choose a dataset to view its visualizations
                    </p>

                </div>


                <div className="gene-dataset-grid">


                    {/* =================================================
                        SOMATIC
                    ================================================= */}

                    {somatic ? (

                        <DatasetCard
                            type="Somatic"
                            count={somaticVariants}
                            samples={somaticSamples}
                            rsids={somaticRsids}
                            color="#13a68b"
                            onClick={() =>
                                navigate(
                                    `/genes/${encodeURIComponent(
                                        decodedGene
                                    )}/somatic`
                                )
                            }
                        />

                    ) : (

                        <div className="gene-dataset-card unavailable">

                            <div className="gene-dataset-title">

                                <span
                                    className="gene-dataset-dot"
                                    style={{
                                        background:
                                            "#13a68b"
                                    }}
                                />

                                <h2>
                                    Somatic
                                </h2>

                            </div>

                            <p>
                                No somatic variants available for this gene.
                            </p>

                        </div>

                    )}


                    {/* =================================================
                        GERMLINE
                    ================================================= */}

                    {germline ? (

                        <DatasetCard
                            type="Germline"
                            count={germlineVariants}
                            samples={germlineSamples}
                            rsids={germlineRsids}
                            color="#275a73"
                            onClick={() =>
                                navigate(
                                    `/genes/${encodeURIComponent(
                                        decodedGene
                                    )}/germline`
                                )
                            }
                        />

                    ) : (

                        <div className="gene-dataset-card unavailable">

                            <div className="gene-dataset-title">

                                <span
                                    className="gene-dataset-dot"
                                    style={{
                                        background:
                                            "#275a73"
                                    }}
                                />

                                <h2>
                                    Germline
                                </h2>

                            </div>

                            <p>
                                No germline variants available for this gene.
                            </p>

                        </div>

                    )}

                </div>

            </div>


        </div>

    );
}


export default GeneDetail;
