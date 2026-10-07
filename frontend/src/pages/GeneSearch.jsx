import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    Search,
    Dna,
    ArrowRight,
    Database,
    BarChart3,
    Activity,
    ShieldCheck,
    Microscope,
    Users,
} from "lucide-react";

import "./GeneSearch.css";
import PageNavigation from "../components/PageNavigation";

function GeneSearch() {
    const navigate = useNavigate();

    const [gene, setGene] = useState("");

    const handleSearch = (e) => {
        e.preventDefault();

        const trimmedGene = gene.trim();

        if (!trimmedGene) {
            return;
        }

        navigate(`/genes/${trimmedGene}`);
    };

    const handleExampleGene = (geneName) => {
        navigate(`/genes/${geneName}`);
    };

    return (
        <div className="gene-search-page">

            {/* =========================================================
                HEADER
            ========================================================= */}

            <div className="gene-search-header">

                <div className="gene-search-breadcrumb">
                    Genomic Portal
                    <span className="breadcrumb-separator">/</span>
                    Gene Browser
                </div>

                <div className="gene-search-header-row">

                    <div>
                        <h1>Gene Browser</h1>

                        <p>
                            Search and explore genomic variants by gene
                        </p>
                    </div>

                    {/* BACK TO DASHBOARD */}

                    <PageNavigation />

                </div>

            </div>


            {/* =========================================================
                SEARCH CARD
            ========================================================= */}

            <div className="gene-search-card">

                <div className="gene-search-icon">
                    <Dna size={28} />
                </div>

                <h2>
                    Search by Gene
                </h2>

                <p className="gene-search-description">
                    Enter a gene symbol to explore variant distribution,
                    consequence, exon and intron information, clinical
                    significance, chromosome distribution and ACMG
                    classification.
                </p>


                {/* SEARCH FORM */}

                <form
                    className="gene-search-form"
                    onSubmit={handleSearch}
                >

                    <div className="gene-input-wrapper">

                        <Search
                            className="gene-input-icon"
                            size={18}
                        />

                        <input
                            type="text"
                            value={gene}
                            onChange={(e) => setGene(e.target.value)}
                            placeholder="Enter gene symbol e.g. TP53"
                        />

                        {gene && (
                            <button
                                type="button"
                                className="clear-search"
                                onClick={() => setGene("")}
                            >
                                ×
                            </button>
                        )}

                    </div>


                    <button
                        type="submit"
                        className="gene-search-button"
                        disabled={!gene.trim()}
                    >
                        <Search size={16} />
                        Search Gene
                    </button>

                </form>

            </div>


            {/* =========================================================
                EXPLORE GENE DATA
            ========================================================= */}

            <section className="gene-explore-section">

                <div className="gene-section-title">

                    <h2>
                        Explore Gene Data
                    </h2>

                    <p>
                        Visualize different aspects of genomic variation
                    </p>

                </div>


                <div className="gene-explore-grid">

                    {/* VARIANT CONSEQUENCES */}

                    <div className="gene-explore-card">

                        <div className="explore-icon green">
                            <BarChart3 size={20} />
                        </div>

                        <h3>
                            Variant Consequences
                        </h3>

                        <p>
                            Explore the distribution of variant
                            consequences for the selected gene.
                        </p>

                    </div>


                    {/* EXON & INTRON */}

                    <div className="gene-explore-card">

                        <div className="explore-icon purple">
                            <Microscope size={20} />
                        </div>

                        <h3>
                            Exon &amp; Intron Distribution
                        </h3>

                        <p>
                            Analyze variants across exon and intron
                            numbers and their total regions.
                        </p>

                    </div>


                    {/* CLINICAL SIGNIFICANCE */}

                    <div className="gene-explore-card">

                        <div className="explore-icon orange">
                            <Activity size={20} />
                        </div>

                        <h3>
                            Clinical Significance
                        </h3>

                        <p>
                            Examine CLIN_SIG annotations associated
                            with variants.
                        </p>

                    </div>


                    {/* CHROMOSOME DISTRIBUTION */}

                    <div className="gene-explore-card">

                        <div className="explore-icon blue">
                            <Dna size={20} />
                        </div>

                        <h3>
                            Chromosome Distribution
                        </h3>

                        <p>
                            View the chromosome distribution of
                            variants for a gene.
                        </p>

                    </div>


                    {/* ACMG */}

                    <div className="gene-explore-card">

                        <div className="explore-icon pink">
                            <ShieldCheck size={20} />
                        </div>

                        <h3>
                            ACMG Classification
                        </h3>

                        <p>
                            Visualize ACMG classifications of
                            identified variants.
                        </p>

                    </div>


                    {/* PATIENT VARIANTS */}

                    <div className="gene-explore-card">

                        <div className="explore-icon teal">
                            <Users size={20} />
                        </div>

                        <h3>
                            Patient Variants
                        </h3>

                        <p>
                            Explore how variants are distributed
                            across affected patients.
                        </p>

                    </div>

                </div>

            </section>


            {/* =========================================================
                EXAMPLE GENES
            ========================================================= */}

            <section className="example-search-section">

                <div className="gene-section-title">

                    <h2>
                        Example Genes
                    </h2>

                    <p>
                        Select a gene to quickly explore its data
                    </p>

                </div>


                <div className="example-gene-grid">

                    {[
                        "TP53",
                        "BRCA1",
                        "BRCA2",
                        "EGFR",
                        "KRAS",
                        "PIK3CA",
                    ].map((geneName) => (

                        <button
                            key={geneName}
                            className="example-gene-button"
                            onClick={() =>
                                handleExampleGene(geneName)
                            }
                        >

                            <div>

                                <Dna size={14} />

                                <span>
                                    {geneName}
                                </span>

                            </div>

                            <ArrowRight size={14} />

                        </button>

                    ))}

                </div>

            </section>


            {/* =========================================================
                DATABASE INFORMATION
            ========================================================= */}

            <div className="gene-database-info">

                <div className="gene-database-info-icon">

                    <Database size={19} />

                </div>

                <div>

                    <strong>
                        Connected to Genomic Variant Database
                    </strong>

                    <p>
                        Gene searches retrieve real-time data directly
                        from the genomic database through the FastAPI
                        backend.
                    </p>

                </div>

            </div>

        </div>
    );
}

export default GeneSearch;
