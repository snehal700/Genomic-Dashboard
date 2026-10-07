import React from "react";

import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";


import Dashboard
    from "./pages/Dashboard";

import GeneSearch
    from "./pages/GeneSearch";

import GeneDetail
    from "./pages/GeneDetail";

import GeneVisualization
    from "./pages/GeneVisualization";

import RSIDSearch
    from "./pages/RSIDSearch";

import RSIDDetail
    from "./pages/RSIDDetail";

import RSIDVisualization
    from "./pages/RSIDVisualization";

import GenePanel
    from "./pages/GenePanel";

import SampleSearch
    from "./pages/SampleSearch";

import SampleDetail
    from "./pages/SampleDetail";

import CohortComparison
    from "./pages/CohortComparison";

import CohortComparisonDetail
    from "./pages/CohortComparisonDetail";


function App() {

    return (

        <BrowserRouter>

            <Routes>


                {/* =================================================
                    HOME
                ================================================= */}

                <Route
                    path="/"
                    element={
                        <Dashboard />
                    }
                />


                {/* =================================================
                    GENE BROWSER
                ================================================= */}

                <Route
                    path="/genes"
                    element={
                        <GeneSearch />
                    }
                />


                {/* =================================================
                    GENE DETAIL
                ================================================= */}

                <Route
                    path="/genes/:gene"
                    element={
                        <GeneDetail />
                    }
                />


                {/* =================================================
                    GENE VISUALIZATION
                    SOMATIC / GERMLINE
                ================================================= */}

                <Route
                    path="/genes/:gene/:dataset"
                    element={
                        <GeneVisualization />
                    }
                />

                <Route
                    path="/gene-panel"
                    element={
                        <GenePanel />
                    }
                />

                <Route
                    path="/samples"
                    element={
                        <SampleSearch />
                    }
                />

                <Route
                    path="/samples/:sample"
                    element={
                        <SampleDetail />
                    }
                />

                <Route
                    path="/cohorts"
                    element={
                        <CohortComparison />
                    }
                />

                <Route
                    path="/cohorts/:comparison"
                    element={
                        <CohortComparisonDetail />
                    }
                />


                {/* =================================================
                    RSID BROWSER
                ================================================= */}

                <Route
                    path="/rsids"
                    element={
                        <RSIDSearch />
                    }
                />


                {/* =================================================
                    RSID DETAIL
                ================================================= */}

                <Route
                    path="/rsids/:rsid"
                    element={
                        <RSIDDetail />
                    }
                />


                {/* =================================================
                    RSID VISUALIZATION
                    SOMATIC / GERMLINE
                ================================================= */}

                <Route
                    path="/rsids/:rsid/:dataset"
                    element={
                        <RSIDVisualization />
                    }
                />


                {/* =================================================
                    FALLBACK
                ================================================= */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

            </Routes>

        </BrowserRouter>

    );
}


export default App;
