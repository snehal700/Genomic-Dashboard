import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search,
    ArrowRight,
    Dna,
    Database,
    AlertCircle,
} from "lucide-react";

import "./RSIDSearch.css";
import PageNavigation from "../components/PageNavigation";

const API_BASE_URL = "http://127.0.0.1:8000";

function RSIDSearch() {
    const navigate = useNavigate();

    const [rsid, setRsid] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSearch = async (event) => {
        event.preventDefault();

        const value = rsid.trim();

        setError("");

        if (!value) {
            setError("Please enter an RSID.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/rsid/${encodeURIComponent(
                    value
                )}/summary`
            );

            if (!response.ok) {
                let message = `RSID '${value}' was not found.`;

                try {
                    const errorData = await response.json();

                    if (errorData.detail) {
                        message = errorData.detail;
                    }
                } catch {
                    // Ignore JSON parsing errors
                }

                setError(message);
                return;
            }

            navigate(
                `/rsids/${encodeURIComponent(value)}`
            );
        } catch (err) {
            console.error("RSID search error:", err);

            setError(
                "Could not connect to the genomic database. Make sure FastAPI is running."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleExample = (value) => {
        setRsid(value);
        setError("");
    };

    return (
        <div className="rsid-search-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="rsid-search-header">

                {/* BACK TO DASHBOARD */}

                <PageNavigation />


                {/* BREADCRUMB */}

                <div className="rsid-breadcrumb">
                    <span>Home</span>
                    <span>/</span>
                    <span>RSID Browser</span>
                </div>


                {/* TITLE */}

                <div className="rsid-title-row">

                    <div className="rsid-title-icon">
                        <Dna size={27} />
                    </div>

                    <div>
                        <h1>RSID Browser</h1>

                        <p>
                            Search genomic variants by RSID
                        </p>
                    </div>

                </div>

            </div>


            {/* =================================================
                SEARCH CARD
            ================================================= */}

            <div className="rsid-search-card">

                <div className="rsid-search-card-header">

                    <div className="rsid-card-icon">
                        <Search size={21} />
                    </div>

                    <div>

                        <h2>
                            Search by RSID
                        </h2>

                        <p>
                            Enter an rsID to explore its genomic
                            annotations and distributions.
                        </p>

                    </div>

                </div>


                {/* SEARCH FORM */}

                <form
                    className="rsid-search-form"
                    onSubmit={handleSearch}
                >

                    <div className="rsid-input-wrapper">

                        <Search
                            size={19}
                            className="rsid-input-icon"
                        />

                        <input
                            type="text"
                            value={rsid}
                            onChange={(event) =>
                                setRsid(event.target.value)
                            }
                            placeholder="Search by RSID, e.g. rs121913343"
                            autoComplete="off"
                        />

                    </div>


                    <button
                        type="submit"
                        disabled={loading}
                        className="rsid-search-button"
                    >

                        {loading ? (
                            "Searching..."
                        ) : (
                            <>
                                Search
                                <ArrowRight size={17} />
                            </>
                        )}

                    </button>

                </form>


                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                    <div className="rsid-error">

                        <AlertCircle size={18} />

                        <span>
                            {error}
                        </span>

                    </div>
                )}


                {/* =================================================
                    EXAMPLES
                ================================================= */}

                <div className="rsid-examples">

                    <span>
                        Example:
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            handleExample("rs121913343")
                        }
                    >
                        rs121913343
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            handleExample("rs121913279")
                        }
                    >
                        rs121913279
                    </button>

                </div>

            </div>


            {/* =================================================
                INFORMATION CARDS
            ================================================= */}

            <div className="rsid-info-grid">

                <div className="rsid-info-card">

                    <div className="rsid-info-icon">
                        <Database size={20} />
                    </div>

                    <div>

                        <h3>
                            Database Search
                        </h3>

                        <p>
                            Search is performed directly
                            against your MariaDB genomic
                            database.
                        </p>

                    </div>

                </div>


                <div className="rsid-info-card">

                    <div className="rsid-info-icon">
                        <Dna size={20} />
                    </div>

                    <div>

                        <h3>
                            Variant Visualization
                        </h3>

                        <p>
                            View consequence, exon, intron,
                            clinical significance, chromosome
                            and ACMG classification separately
                            for Somatic and Germline variants.
                        </p>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default RSIDSearch;
