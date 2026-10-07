import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
    ArrowLeft,
    Dna,
    Activity,
    Database,
    ShieldCheck,
    LoaderCircle,
    AlertCircle,
} from "lucide-react";

import "./RSIDDetail.css";
import PageNavigation from "../components/PageNavigation";


const API_BASE_URL =
    "http://127.0.0.1:8000";


function RSIDDetail() {

    const navigate = useNavigate();

    const { rsid } = useParams();


    const [data, setData] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");


    /* =========================================================
       LOAD RSID DATA
    ========================================================= */

    useEffect(() => {

        const loadRSID = async () => {

            setLoading(true);
            setError("");


            try {

                /*
                 * -------------------------------------------------
                 * IMPORTANT
                 * -------------------------------------------------
                 *
                 * We use the SAME visualization endpoint
                 * that is already returning the correct rows.
                 *
                 * We request Somatic and Germline separately.
                 */

                const somaticURL =
                    `${API_BASE_URL}/api/rsid/${encodeURIComponent(
                        rsid
                    )}/visualizations?result_type=Somatic`;


                const germlineURL =
                    `${API_BASE_URL}/api/rsid/${encodeURIComponent(
                        rsid
                    )}/visualizations?result_type=Germline`;


                const [
                    somaticResponse,
                    germlineResponse
                ] = await Promise.all([
                    fetch(somaticURL),
                    fetch(germlineURL)
                ]);


                /* =================================================
                   SOMATIC DATA
                ================================================= */

                let somaticData = null;

                if (somaticResponse.ok) {

                    somaticData =
                        await somaticResponse.json();

                }


                /* =================================================
                   GERMLINE DATA
                ================================================= */

                let germlineData = null;

                if (germlineResponse.ok) {

                    germlineData =
                        await germlineResponse.json();

                }


                /*
                 * -------------------------------------------------
                 * If BOTH requests fail, the RSID does not exist.
                 * -------------------------------------------------
                 */

                if (
                    !somaticResponse.ok &&
                    !germlineResponse.ok
                ) {

                    let message =
                        `RSID '${rsid}' was not found.`;

                    try {

                        const errorData =
                            await somaticResponse.json();

                        if (errorData.detail) {

                            message =
                                errorData.detail;

                        }

                    } catch {
                        // Ignore JSON parsing errors
                    }


                    throw new Error(message);

                }


                /* =================================================
                   GET COUNTS
                ================================================= */

                const somaticCount =
                    Number(
                        somaticData?.summary?.total_variants || 0
                    );


                const germlineCount =
                    Number(
                        germlineData?.summary?.total_variants || 0
                    );


                const totalCount =
                    somaticCount +
                    germlineCount;


                /*
                 * RSID returned by either endpoint.
                 * Fall back to URL parameter.
                 */

                const actualRsid =
                    somaticData?.rsid ||
                    germlineData?.rsid ||
                    rsid;


                /*
                 * Samples affected.
                 *
                 * The visualization endpoint provides this
                 * inside its summary for each dataset.
                 */

                const somaticSamples =
                    Number(
                        somaticData?.summary?.samples_affected || 0
                    );


                const germlineSamples =
                    Number(
                        germlineData?.summary?.samples_affected || 0
                    );


                const samplesAffected =
                    somaticSamples +
                    germlineSamples;


                /* =================================================
                   SAVE FINAL DATA
                ================================================= */

                setData({

                    rsid: actualRsid,

                    total_variants:
                        totalCount,

                    somatic_count:
                        somaticCount,

                    germline_count:
                        germlineCount,

                    samples_affected:
                        samplesAffected,

                });


                console.log(
                    "RSID detail data:",
                    {
                        rsid: actualRsid,
                        total: totalCount,
                        somatic: somaticCount,
                        germline: germlineCount,
                    }
                );

            }


            catch (err) {

                console.error(
                    "RSID detail error:",
                    err
                );


                setError(
                    err.message ||
                    "Unable to load RSID data."
                );

            }


            finally {

                setLoading(false);

            }

        };


        if (rsid) {

            loadRSID();

        }

    }, [rsid]);


    /* =========================================================
       LOADING
    ========================================================= */

    if (loading) {

        return (

            <div className="rsid-detail-state">

                <LoaderCircle
                    size={34}
                    className="rsid-detail-spinner"
                />

                <h2>
                    Loading RSID
                </h2>

                <p>
                    Fetching genomic information for{" "}
                    {rsid}
                </p>

            </div>

        );

    }


    /* =========================================================
       ERROR
    ========================================================= */

    if (error) {

        return (

            <div className="rsid-detail-state">

                <div className="rsid-detail-error-icon">

                    <AlertCircle
                        size={30}
                    />

                </div>


                <h2>
                    Unable to load RSID
                </h2>


                <p>
                    {error}
                </p>


                <button
                    className="rsid-back-button"
                    onClick={() =>
                        navigate("/rsids")
                    }
                >

                    <ArrowLeft
                        size={15}
                    />

                    Back to RSID Browser

                </button>

            </div>

        );

    }


    /* =========================================================
       SAFETY
    ========================================================= */

    if (!data) {

        return null;

    }


    /* =========================================================
       VALUES
    ========================================================= */

    const totalVariants =
        Number(
            data.total_variants || 0
        );


    const somaticVariants =
        Number(
            data.somatic_count || 0
        );


    const germlineVariants =
        Number(
            data.germline_count || 0
        );


    /* =========================================================
       PAGE
    ========================================================= */

    return (

        <div className="rsid-detail-page">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="rsid-detail-header">

                <div>

                    <div className="rsid-detail-breadcrumb">

                        <button
                            onClick={() =>
                                navigate("/")
                            }
                        >
                            Home
                        </button>


                        <span>
                            /
                        </span>


                        <button
                            onClick={() =>
                                navigate("/rsids")
                            }
                        >
                            RSID Browser
                        </button>


                        <span>
                            /
                        </span>


                        <span>
                            {data.rsid}
                        </span>

                    </div>


                    <div className="rsid-detail-title">

                        <div className="rsid-detail-title-icon">

                            <Dna
                                size={25}
                            />

                        </div>


                        <div>

                            <h1>
                                {data.rsid}
                            </h1>

                            <p>
                                Genomic variant
                                annotation overview
                            </p>

                        </div>

                    </div>

                </div>


                <PageNavigation />

            </div>


            {/* =================================================
                SUMMARY CARDS
            ================================================= */}

            <div className="rsid-summary-grid">


                {/* TOTAL */}

                <div className="rsid-summary-card">

                    <div className="rsid-summary-icon">

                        <Database
                            size={20}
                        />

                    </div>


                    <span>
                        Total Variants
                    </span>


                    <strong>
                        {totalVariants}
                    </strong>

                </div>


                {/* SOMATIC */}

                <div className="rsid-summary-card">

                    <div className="rsid-summary-icon">

                        <Activity
                            size={20}
                        />

                    </div>


                    <span>
                        Somatic Variants
                    </span>


                    <strong>
                        {somaticVariants}
                    </strong>

                </div>


                {/* GERMLINE */}

                <div className="rsid-summary-card">

                    <div className="rsid-summary-icon">

                        <ShieldCheck
                            size={20}
                        />

                    </div>


                    <span>
                        Germline Variants
                    </span>


                    <strong>
                        {germlineVariants}
                    </strong>

                </div>


                {/* RSID */}

                <div className="rsid-summary-card">

                    <div className="rsid-summary-icon">

                        <Dna
                            size={20}
                        />

                    </div>


                    <span>
                        RSID
                    </span>


                    <strong>
                        {data.rsid}
                    </strong>

                </div>

            </div>


            {/* =================================================
                DATASET SECTION
            ================================================= */}

            <div className="rsid-type-selection">


                <div className="rsid-type-selection-header">

                    <h2>
                        Select Dataset
                    </h2>


                    <p>
                        Choose Somatic or Germline to
                        view its visualizations.
                    </p>

                </div>


                <div className="rsid-type-buttons">


                    {/* =================================================
                        SOMATIC
                    ================================================= */}

                    {somaticVariants > 0 ? (

                        <button
                            className="rsid-type-card somatic"

                            onClick={() =>
                                navigate(
                                    `/rsids/${encodeURIComponent(
                                        data.rsid
                                    )}/somatic`
                                )
                            }
                        >

                            <div className="rsid-type-icon">

                                <Activity
                                    size={23}
                                />

                            </div>


                            <div>

                                <strong>
                                    Somatic
                                </strong>

                                <span>
                                    {somaticVariants}{" "}
                                    variants
                                </span>

                            </div>


                            <ArrowLeft
                                size={18}
                                className="rsid-type-arrow"
                            />

                        </button>

                    ) : (

                        <div
                            className="rsid-type-card unavailable"
                        >

                            <div className="rsid-type-icon">

                                <Activity
                                    size={23}
                                />

                            </div>


                            <div>

                                <strong>
                                    Somatic
                                </strong>

                                <span>
                                    No somatic variants
                                </span>

                            </div>

                        </div>

                    )}


                    {/* =================================================
                        GERMLINE
                    ================================================= */}

                    {germlineVariants > 0 ? (

                        <button
                            className="rsid-type-card germline"

                            onClick={() =>
                                navigate(
                                    `/rsids/${encodeURIComponent(
                                        data.rsid
                                    )}/germline`
                                )
                            }
                        >

                            <div className="rsid-type-icon">

                                <ShieldCheck
                                    size={23}
                                />

                            </div>


                            <div>

                                <strong>
                                    Germline
                                </strong>

                                <span>
                                    {germlineVariants}{" "}
                                    variants
                                </span>

                            </div>


                            <ArrowLeft
                                size={18}
                                className="rsid-type-arrow"
                            />

                        </button>

                    ) : (

                        <div
                            className="rsid-type-card unavailable"
                        >

                            <div className="rsid-type-icon">

                                <ShieldCheck
                                    size={23}
                                />

                            </div>


                            <div>

                                <strong>
                                    Germline
                                </strong>

                                <span>
                                    No germline variants
                                </span>

                            </div>

                        </div>

                    )}

                </div>


                {/* =================================================
                    DATABASE NOTE
                ================================================= */}

                <div className="rsid-database-note">

                    <Database
                        size={18}
                    />

                    <span>
                        Variant information retrieved
                        from the genomic MariaDB database.
                    </span>

                </div>

            </div>

        </div>

    );

}


export default RSIDDetail;
