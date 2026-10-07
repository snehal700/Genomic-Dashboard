# Genomic Variation Dashboard

A full-stack genomic analysis dashboard for exploring somatic and germline
variant data by gene, rsID, sample, cohort, and curated gene panel. The
application uses **MariaDB as its only runtime data source**. The React client
requests data through the FastAPI backend; it does not read CSV or Excel files
directly.

## Contents

- [Architecture](#architecture)
- [Main workflows](#main-workflows)
- [Frontend](#frontend)
- [Backend API](#backend-api)
- [Database schema](#database-schema)
- [Data lifecycle](#data-lifecycle)
- [Excel database update](#excel-database-update)
- [Local setup](#local-setup)
- [Project structure](#project-structure)
- [Operational notes](#operational-notes)

## Architecture

```text
React + Vite + Recharts
        │ HTTP (localhost:5173 → localhost:8000)
        ▼
FastAPI application (backend/main.py)
        │ PyMySQL, parameterized SQL, transactions
        ▼
MariaDB
  ├── patients
  ├── variants
  ├── gene_panels
  └── gene_panel_genes
```

The backend owns all database access. `backend/database.py` reads MariaDB
connection settings from environment variables and wraps PyMySQL cursors so the
existing parameterized endpoint SQL can use `?` placeholders safely. There is
no ORM and no SQLite runtime path.

## Main workflows

### Dashboard (`/`)

The main dashboard calls `GET /api/dashboard` and presents:

- total patients, variants, unique genes, cohorts, and distinct diagnoses;
- cohort overview and cohort summary;
- somatic versus germline composition;
- high-level consequence/impact statistics and top genes;
- Quick Links to Gene Browser, RSID Browser, Sample Browser, Cohort
  Comparison, and Gene Panel;
- a database update card at the bottom of the page.

The dashboard display translates the persisted `CS` cohort label to `CN` in
the cohort overview and cohort summary. Database records remain `CS` so they
continue to align with the imported source data and cohort-comparison routes.

### Gene Browser

1. The user enters a gene symbol on `/genes`.
2. The client navigates to `/genes/:gene`.
3. The detail page loads somatic and germline availability/count information
   from the gene visualization endpoint.
4. Selecting Somatic or Germline opens `/genes/:gene/:dataset`.
5. `GET /api/gene/{gene}/visualizations?result_type=Somatic|Germline`
   returns the selected dataset's summary and distributions.

Gene visualizations include consequence, exon and intron `number/total`
categories, clinical significance, cohort representation, and either ACMG
classification (germline) or AMP category (somatic).

### RSID Browser

1. The user searches an rsID at `/rsids`.
2. `GET /api/rsid/{rsid}/summary` validates the identifier and returns total,
   somatic, and germline counts.
3. `/rsids/:rsid` exposes available datasets.
4. `/rsids/:rsid/:dataset` loads the selected result type through
   `GET /api/rsid/{rsid}/visualizations`.

RSID visualizations follow the same annotation approach as gene
visualizations: consequence, exon, intron, clinical significance, cohort
summary, ACMG for germline, and AMP category for somatic.

### Sample Browser

1. `/samples` validates a submitted sample identifier using the somatic sample
   overview endpoint.
2. A valid identifier opens `/samples/:sample`.
3. The detail page requests only the selected dataset type from
   `GET /api/samples/{patient_id}/overview?result_type=Somatic|Germline`.
4. The Somatic/Germline toggle refetches a separately filtered profile.

The profile prominently shows sample ID, diagnosis, and cohort, then provides
variant totals, unique genes/rsIDs/chromosomes, consequence and impact
distributions, gene burden scatter plot, chromosome histogram, and a compact
expandable variants table. Gene links reuse the Gene Browser route.

### Cohort Comparison

`/cohorts` offers pairwise cohort choices. The selected comparison route uses:

```text
GET /api/cohorts/compare?left=<cohort>&right=<cohort>&result_type=Both|Somatic|Germline
```

The API limits cohort values to `CON`, `COT`, `CS`, and `CTN`, rejects equal
cohorts, and calculates:

- per-cohort variants, samples, unique genes, and rsIDs;
- shared and cohort-specific variants, genes, and rsIDs;
- variant-type, impact, chromosome, and top-gene distributions;
- interleaved recent records from both cohorts.

### Gene Panel

`/gene-panel` first loads available panels from MariaDB, then loads only the
selected panel's ordered genes. It preserves original import order and duplicate
gene entries. The page filters the already loaded selected panel client-side;
the gene card action navigates into the existing Gene Browser workflow.

## Frontend

The client is a React 19 application built with Vite 8.

| Area | Implementation |
| --- | --- |
| Routing | `react-router-dom` browser routes in `frontend/src/App.jsx` |
| Charts | `recharts` responsive bar, donut/pie, line, scatter, and histogram charts |
| Icons | `lucide-react` |
| HTTP | Native `fetch` on pages; Axios helper in `frontend/src/api.js` |
| Styling | Page-local CSS files plus `index.css` and `styles.css` |
| API base URL | `http://127.0.0.1:8000` in current page implementations |

### Client routes

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | `Dashboard` | Portal landing page and database upload form |
| `/genes` | `GeneSearch` | Gene symbol search |
| `/genes/:gene` | `GeneDetail` | Gene summary and dataset choice |
| `/genes/:gene/:dataset` | `GeneVisualization` | Somatic or germline gene charts |
| `/rsids` | `RSIDSearch` | rsID search |
| `/rsids/:rsid` | `RSIDDetail` | rsID summary and dataset choice |
| `/rsids/:rsid/:dataset` | `RSIDVisualization` | Somatic or germline rsID charts |
| `/samples` | `SampleSearch` | Patient/sample lookup |
| `/samples/:sample` | `SampleDetail` | Selected sample profile |
| `/cohorts` | `CohortComparison` | Cohort pair selector |
| `/cohorts/:comparison` | `CohortComparisonDetail` | Cohort comparison analysis |
| `/gene-panel` | `GenePanel` | Ordered panel-gene browser |

Unknown frontend routes redirect to `/`. The Dashboard currently has an
Analytics Quick Link that navigates to `/analytics`; no route is registered for
that path, so it currently resolves through this fallback.

## Backend API

The FastAPI app is in `backend/main.py`. It permits the Vite development
origins `http://localhost:5173` and `http://127.0.0.1:5173` through CORS.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | API status and database type |
| `GET` | `/api/health` | MariaDB connectivity health check |
| `GET` | `/api/dashboard` | Dashboard totals, cohorts, dataset split, and top genes |
| `GET` | `/api/gene-panels` | Ordered panel metadata |
| `GET` | `/api/gene-panels/{panel_id}` | Selected panel with all ordered gene entries |
| `GET` | `/api/gene/{gene}/visualizations?result_type=` | Gene summary and annotation distributions |
| `GET` | `/api/rsid/{rsid}/summary` | rsID existence and result-type counts |
| `GET` | `/api/rsid/{rsid}/visualizations?result_type=` | rsID summary and annotation distributions |
| `GET` | `/api/samples/{patient_id}/overview?result_type=` | Sample summary, charts, diagnosis, and variants |
| `GET` | `/api/cohorts/compare?left=&right=&result_type=` | Two-cohort analysis |
| `POST` | `/api/upload-excel` | Transactional patient variant import/update |

`result_type` is restricted to `Somatic` or `Germline` on the gene, rsID,
sample, and upload endpoints. Invalid/missing entities return a structured
FastAPI HTTP error; search pages surface this to the user.

## Database schema

### Relationships

```text
patients (1) ──< variants (many)

gene_panels (1) ──< gene_panel_genes (many)
```

`variants.patient_id` is application-associated with `patients.patient_id`.
The current schema indexes variants by patient, cohort, result type, gene
symbol, and rsID, but does not enforce a database-level foreign key for the
patient relationship. `gene_panel_genes.panel_id` has an enforced foreign key
to `gene_panels.panel_id` with cascade deletion.

### `patients`

| Column | Type | Notes |
| --- | --- | --- |
| `patient_id` | `VARCHAR(255)` | Primary key; sample/patient identifier |
| `cohort` | `VARCHAR(32)` | Source cohort code |
| `age` | `INT` | Optional demographic field |
| `sex` | `VARCHAR(64)` | Optional demographic field |
| `diagnosis` | `TEXT` | Disease mapped from `sample_diseases.csv` during initialization or supplied by upload |

### `variants`

`variant_row_id BIGINT AUTO_INCREMENT` is the primary key. The table stores
one row per imported variant annotation. Core linkage columns are:

| Field group | Columns |
| --- | --- |
| Ownership and dataset | `patient_id`, `cohort`, `result_type` |
| Variant locus/call | `CHROM`, `POS`, `REF`, `ALT`, `INFO`, `QUAL`, `FILTER`, `Location` |
| Genotype/depth | `GT`, `AD`, `F1R2`, `F2R1`, `FAD`, `SB`, `GQ`, `PL`, `AF`, `DP`, `VAF`, `VAF_Confidence`, `Zygosity_label`, `varient_type`, `Tumor_Ref_allele_Depth`, `Tumor_Alt_allele_Depth`, `Tumor_Total_Genotype_Depth` |
| VEP/gene/transcript | `Intogen`, `Consequence`, `IMPACT`, `SYMBOL`, `Gene`, `Feature_type`, `Feature`, `BIOTYPE`, `EXON`, `INTRON`, `HGVSc`, `HGVSp`, `cDNA_position`, `CDS_position`, `Protein_position`, `Amino_acids`, `Codons`, `DISTANCE`, `STRAND`, `FLAGS`, `SYMBOL_SOURCE`, `HGNC_ID`, `MANE_SELECT`, `MANE_PLUS_CLINICAL`, `TSL`, `APPRIS` |
| Identifiers | `rsID`, `COSMIC_ID`, `Mastermind_MMID3`, `PUBMED` |
| Functional predictions | `SIFT`, `PolyPhen`, `LRT_pred`, `MutationTaster_pred`, `MutationAssessor_pred`, `FATHMM_pred`, `PROVEAN_pred`, `MetaLR_pred`, `DEOGEN2_pred`, `ClinPred_pred`, `CADD_phred`, `CADD_raw`, `REVEL_score`, `AlphaMissense_pathogenicity`, `AlphaMissense_class` |
| Population frequencies | `AF_1000G`, `gnomADe_AF`, `gnomADe_AFR_AF`, `gnomADe_AMR_AF`, `gnomADe_ASJ_AF`, `gnomADe_EAS_AF`, `gnomADe_FIN_AF`, `gnomADe_NFE_AF`, `gnomADe_SAS_AF`, `IndGenome_AF` |
| Clinical/disease evidence | `CLIN_SIG`, `SOMATIC`, `PHENO`, `PHENOTYPES`, `DisGeNET`, `ACMG_Criteria`, `ACMG_Classification`, `ClinVar`, `ClinVar_CLNSIG`, `ClinVar_CLNDN`, `ClinVar_CLNREVSTAT` |
| CIViC and AMP | `CIViC`, `CIVIC_EVIDENCE_LEVEL`, `CIVIC_CLINICAL_SIGNIFICANCE`, `CIVIC_DISEASES`, `CIVIC_THERAPIES`, `AMP_Tier`, `AMP_Category`, `AMP_Evidence` |
| Regulatory/splice annotation | `HGVS_OFFSET`, `MOTIF_NAME`, `MOTIF_POS`, `HIGH_INF_POS`, `MOTIF_SCORE_CHANGE`, `TRANSCRIPTION_FACTORS`, `SpliceAI_SYMBOL`, `SpliceAI_DS_AG`, `SpliceAI_DS_AL`, `SpliceAI_DS_DG`, `SpliceAI_DS_DL`, `SpliceAI_DP_AG`, `SpliceAI_DP_AL`, `SpliceAI_DP_DG`, `SpliceAI_DP_DL` |

All non-key variant annotation fields are nullable `TEXT` in the current
schema. Indexes are present on `SYMBOL`, `patient_id`, `cohort`, `result_type`,
and `rsID` (text indexes use a 191-character prefix where required).

### `gene_panels`

| Column | Type | Notes |
| --- | --- | --- |
| `panel_id` | `INT` | Primary key, source-column position |
| `name` | `VARCHAR(255)` | Panel/category name from source header |
| `display_order` | `INT` | Original panel ordering |
| `gene_count` | `INT` | Imported non-empty entry count; duplicates retained |

### `gene_panel_genes`

| Column | Type | Notes |
| --- | --- | --- |
| `entry_id` | `BIGINT AUTO_INCREMENT` | Primary key |
| `panel_id` | `INT` | Required foreign key to `gene_panels` |
| `gene` | `VARCHAR(255)` | Original gene entry |
| `display_order` | `INT` | Original row order within its panel |

### Current imported data snapshot

At the time this README was generated, MariaDB contained:

| Item | Current value |
| --- | ---: |
| Patients | 4 |
| Variant records | 287,035 |
| Germline records | 286,026 |
| Somatic records | 1,009 |
| Gene panels | 7 |
| Panel gene entries | 5,051 |

The source panel headers and imported counts are:

| Panel | Entries |
| --- | ---: |
| Unique (Somatic) - 1332 genes | 1,332 |
| Hereditary (germline) - 158 genes | 158 |
| Cardiac - 565 genes | 565 |
| Diabetes_pharmgkb_mito genes - 318 genes | 318 |
| NDD - 890 genes | 889 |
| Endometriosis - 53 genes | 56 |
| Neurodevelopmental - 1733 genes | 1,733 |

The count is the actual number of non-empty source entries, not a value parsed
from a panel name. This is why a source header's descriptive number can differ
from the imported entry count.

## Data lifecycle

### Runtime source of truth

MariaDB is the sole runtime source. Page data, search validation, charts,
diagnoses, panels, filters, and dashboard statistics all originate from the
database through FastAPI.

### Source files used only for import/maintenance

| File/location | Purpose |
| --- | --- |
| `backend/*_results/Germline/*.csv` | Initial germline source data |
| `backend/*_results/Somatic/*.xlsx` | Initial somatic source data |
| `backend/gene_panels.csv` | Source for panel headers and ordered gene entries |
| `backend/sample_diseases.csv` | Exact `Sample ID` → `Organ Type` diagnosis mapping |

`initialize_mariadb_data.py` is a maintenance/import utility. It creates the
two panel tables if needed, reloads all panel entries in one transaction, then
updates `patients.diagnosis` only when an exact `Sample ID` match has a
non-empty `Organ Type` value. It never invents a diagnosis.

Run it after intentionally updating either source mapping file:

```powershell
cd backend
.\venv\Scripts\python.exe initialize_mariadb_data.py
```

## Excel database update

The final section of the Dashboard provides an upload form. It requires:

- Patient ID
- Cohort (`CON`, `COT`, `CS`, or `CTN`)
- Variant set (`Somatic` or `Germline`)
- An `.xlsx` or `.xls` workbook

Diagnosis is optional. The workbook must have non-empty `CHROM`, `POS`, `REF`,
and `ALT` columns for every row. Other recognized columns are inserted only if
they already exist in the `variants` schema. The historical column spelling
`Tumor_Ref_alele_Depth` is normalized to
`Tumor_Ref_allele_Depth` during upload.

The endpoint performs the following transaction:

1. Validate form values, file extension, workbook readability, required
   columns, and row-level core variant values.
2. Upsert the patient. For an existing patient, cohort is updated; diagnosis
   is updated only when a non-empty diagnosis is supplied.
3. Delete existing variants for that patient and the selected result type.
4. Insert all validated uploaded rows with the selected patient, cohort, and
   result type.
5. Commit only if every operation succeeds; otherwise roll back everything.

After success, the frontend refetches dashboard statistics automatically.

## Local setup

### Prerequisites

- Node.js and npm
- Python 3.10+ (the backend uses `str | None` annotations)
- MariaDB

### MariaDB environment

Set these environment variables or put them in `backend/.env` for local-only
development. Do not commit passwords.

```dotenv
MARIADB_HOST=127.0.0.1
MARIADB_PORT=3306
MARIADB_DATABASE=genomic_dashboard
MARIADB_USER=genomic_app
MARIADB_PASSWORD=replace-with-a-secret
```

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

FastAPI starts on `http://127.0.0.1:8000` by default. Its interactive OpenAPI
documentation is available at `http://127.0.0.1:8000/docs` while running.

### Frontend

In a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite serves the application at the URL displayed in the terminal, normally
`http://127.0.0.1:5173`.

### Validation commands

```powershell
# Frontend production build
cd frontend
npm run build

# Backend syntax check
cd ..\backend
.\venv\Scripts\python.exe -m py_compile main.py database.py initialize_mariadb_data.py
```

## Project structure

```text
genomic_dashboard/
├── README.md                         # This project guide
├── backend/
│   ├── main.py                       # FastAPI routes, analysis queries, upload endpoint
│   ├── database.py                   # MariaDB environment/configuration and connection wrapper
│   ├── initialize_mariadb_data.py    # Panel/diagnosis import utility
│   ├── requirements.txt              # Python dependencies
│   ├── gene_panels.csv               # Import source only
│   ├── sample_diseases.csv           # Import source only
│   └── {CON,COT,CS,CTN}_results/     # Initial source result files
└── frontend/
    ├── src/App.jsx                   # Client route registration
    ├── src/pages/                    # Dashboard, search, detail, comparison, panel pages
    ├── src/components/PageNavigation.jsx
    ├── src/*.css                     # Shared application CSS
    ├── package.json                  # Client dependencies and scripts
    └── vite.config.js                # Vite configuration
```

## Operational notes

- MariaDB credentials are environment-based and are not embedded in source.
- SQL values use parameters. Dynamic spreadsheet columns are intersected with
  columns discovered from MariaDB's `information_schema` before insertion.
- The upload endpoint is intentionally destructive only within the selected
  patient's selected result type: it replaces that dataset's prior rows with
  the uploaded workbook contents.
- The application currently has no authentication or authorization layer.
  Protect the API and restrict its CORS origins before exposing it outside a
  trusted network.
- The frontend currently uses fixed local API URLs in several pages. For a
  production deployment, centralize this in an environment-driven client API
  base URL and configure CORS for the production frontend origin.
