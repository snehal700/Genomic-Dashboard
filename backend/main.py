from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import re
from io import BytesIO
import pandas as pd
from database import get_connection


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="Genomic Portal API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE
# ============================================================

def dashboard_disease_count():
    conn = get_connection()
    try:
        row = conn.execute("SELECT COUNT(DISTINCT diagnosis) AS count FROM patients WHERE diagnosis IS NOT NULL AND TRIM(diagnosis) NOT IN ('', 'N/A')").fetchone()
        return row["count"]
    finally:
        conn.close()


# ============================================================
# HELPERS
# ============================================================

def clean_value(value):
    if value is None:
        return "Unknown"

    value = str(value).strip()

    if value == "":
        return "Unknown"

    if value.lower() in [
        "nan",
        "none",
        "null",
        "na",
        "n/a"
    ]:
        return "Unknown"

    return value


def split_annotation(value):
    """
    Splits annotations such as:

        Missense
        Missense;Splice_region_variant
        Pathogenic|Likely_pathogenic

    into a list.
    """

    value = clean_value(value)

    if value == "Unknown":
        return ["Unknown"]

    parts = re.split(r"[;,|]", value)

    result = []

    for part in parts:
        part = part.strip()

        if part:
            result.append(part)

    return result if result else ["Unknown"]


def parse_number(value):
    try:
        return int(value)
    except Exception:
        return 0


def nullable_cell(value):
    """Return a database-safe cell value from a spreadsheet cell."""
    if pd.isna(value):
        return None
    value = str(value).strip()
    return value or None


def load_upload_columns(conn):
    """Read the established variants schema instead of maintaining a second schema."""
    rows = conn.execute(
        """SELECT COLUMN_NAME FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = 'variants'
           ORDER BY ORDINAL_POSITION"""
    ).fetchall()
    return {row["COLUMN_NAME"] for row in rows}


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Genomic Portal API is running",
        "database": "MariaDB",
    }


# ============================================================
# GENE PANELS
# ============================================================

@app.get("/api/gene-panels")
def gene_panels():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT panel_id AS id, name, gene_count FROM gene_panels ORDER BY display_order").fetchall()
        return {"panels": rows}
    finally:
        conn.close()


@app.get("/api/gene-panels/{panel_id}")
def gene_panel_genes(panel_id: int):
    conn = get_connection()
    try:
        panel = conn.execute("SELECT panel_id AS id, name FROM gene_panels WHERE panel_id=?", (panel_id,)).fetchone()
        if not panel:
            raise HTTPException(status_code=404, detail="Gene panel not found")
        rows = conn.execute("SELECT gene FROM gene_panel_genes WHERE panel_id=? ORDER BY display_order", (panel_id,)).fetchall()
        return {"id": panel["id"], "name": panel["name"], "genes": [row["gene"] for row in rows]}
    finally:
        conn.close()


# ============================================================
# EXCEL DATABASE UPDATE
# ============================================================

@app.post("/api/upload-excel")
async def upload_excel(
    patient_id: str = Form(...),
    cohort: str = Form(...),
    result_type: str = Form("Somatic"),
    diagnosis: str | None = Form(None),
    file: UploadFile = File(...),
):
    """Replace one patient's result-type rows in one atomic MariaDB transaction."""
    patient_id = patient_id.strip()
    cohort = cohort.strip().upper()
    diagnosis = diagnosis.strip() if diagnosis else None

    if not patient_id or not cohort:
        raise HTTPException(status_code=422, detail="patient_id and cohort are required")
    if cohort not in COHORTS:
        raise HTTPException(status_code=422, detail="cohort must be one of CON, COT, CS, or CTN")
    if result_type not in {"Somatic", "Germline"}:
        raise HTTPException(status_code=422, detail="result_type must be Somatic or Germline")
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=422, detail="Upload an Excel .xlsx or .xls file")

    try:
        workbook = await file.read()
        frame = pd.read_excel(BytesIO(workbook))
    except Exception as exc:
        raise HTTPException(status_code=422, detail="The uploaded file is not a readable Excel workbook") from exc

    # Preserve the established variant format while accepting the historical source typo.
    frame = frame.rename(columns={"Tumor_Ref_alele_Depth": "Tumor_Ref_allele_Depth"})
    frame.columns = [str(column).strip() for column in frame.columns]
    required_columns = {"CHROM", "POS", "REF", "ALT"}
    missing = sorted(required_columns - set(frame.columns))
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing required Excel columns: {', '.join(missing)}")
    if frame.empty or frame[list(required_columns)].isna().any(axis=None):
        raise HTTPException(status_code=422, detail="Every variant row must include CHROM, POS, REF, and ALT")

    conn = get_connection()
    try:
        available_columns = load_upload_columns(conn)
        source_columns = [column for column in frame.columns if column in available_columns and column not in {"variant_row_id", "patient_id", "cohort", "result_type"}]
        if not source_columns:
            raise HTTPException(status_code=422, detail="The Excel file has no recognized variant data columns")

        cursor = conn.cursor()
        cursor.execute("START TRANSACTION")
        cursor.execute(
            """INSERT INTO patients (patient_id, cohort, diagnosis)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE cohort=VALUES(cohort),
                   diagnosis=COALESCE(VALUES(diagnosis), diagnosis)""",
            (patient_id, cohort, diagnosis),
        )
        cursor.execute("DELETE FROM variants WHERE patient_id=? AND result_type=?", (patient_id, result_type))

        insert_columns = ["patient_id", "cohort", "result_type", *source_columns]
        placeholders = ", ".join(["?"] * len(insert_columns))
        quoted_columns = ", ".join(f"`{column}`" for column in insert_columns)
        rows = [
            (patient_id, cohort, result_type, *[nullable_cell(record[column]) for column in source_columns])
            for _, record in frame.iterrows()
        ]
        cursor.executemany(
            f"INSERT INTO variants ({quoted_columns}) VALUES ({placeholders})",
            rows,
        )
        conn.commit()
        return {"message": "Excel data imported successfully", "patient_id": patient_id, "cohort": cohort, "result_type": result_type, "variants_imported": len(rows)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=422, detail=f"Database update failed: {exc}") from exc
    finally:
        conn.close()


# ============================================================
# SAMPLE BROWSER
# ============================================================

def sample_overview(patient_id, result_type):
    if result_type not in ["Somatic", "Germline"]:
        raise HTTPException(status_code=400, detail="result_type must be Somatic or Germline")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) AS count FROM patients WHERE LOWER(patient_id)=LOWER(?)", (patient_id,))
    if cursor.fetchone()["count"] == 0:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Sample '{patient_id}' was not found")
    cursor.execute("""SELECT COUNT(*) total_variants, COUNT(DISTINCT rsID) unique_rsids,
        COUNT(DISTINCT SYMBOL) unique_genes, COUNT(DISTINCT CHROM) chromosomes
        FROM variants WHERE LOWER(patient_id)=LOWER(?) AND result_type=?""", (patient_id, result_type))
    summary = dict(cursor.fetchone())
    def grouped(column, label="name", limit=None):
        suffix = f" LIMIT {limit}" if limit else ""
        cursor.execute(f"SELECT {column} value, COUNT(*) count FROM variants WHERE LOWER(patient_id)=LOWER(?) AND result_type=? GROUP BY {column} ORDER BY count DESC{suffix}", (patient_id, result_type))
        return [{label: clean_value(row["value"]), "count": row["count"]} for row in cursor.fetchall()]
    consequence_counts = {}
    cursor.execute("SELECT Consequence, COUNT(*) count FROM variants WHERE LOWER(patient_id)=LOWER(?) AND result_type=? GROUP BY Consequence", (patient_id, result_type))
    for row in cursor.fetchall():
        for item in split_annotation(row["Consequence"]): consequence_counts[item] = consequence_counts.get(item, 0) + row["count"]
    consequence = [{"name": key, "count": value} for key, value in sorted(consequence_counts.items(), key=lambda item: item[1], reverse=True)]
    cursor.execute("""SELECT SYMBOL, rsID, Consequence, IMPACT, CHROM, POS FROM variants
        WHERE LOWER(patient_id)=LOWER(?) AND result_type=? ORDER BY variant_row_id DESC""", (patient_id, result_type))
    variants = [dict(row) for row in cursor.fetchall()]
    cursor.execute("SELECT cohort, diagnosis FROM patients WHERE LOWER(patient_id)=LOWER(?)", (patient_id,))
    patient = cursor.fetchone()
    cohort = patient["cohort"]
    disease = patient["diagnosis"] or "Not classified"
    impact = grouped("IMPACT")
    top_genes = grouped("SYMBOL", "gene", 10)
    chromosome = grouped("CHROM", "chromosome")

    def chromosome_order(item):
        value = str(item["chromosome"]).strip().upper().removeprefix("CHR")
        if value.isdigit():
            return (0, int(value))
        if value == "X":
            return (1, 23)
        if value == "Y":
            return (1, 24)
        if value in {"M", "MT"}:
            return (2, 25)
        return (3, value)

    chromosome.sort(key=chromosome_order)
    conn.close()
    return {"patient_id": patient_id, "result_type": result_type, "disease": disease, "cohort": cohort, "summary": summary, "consequence": consequence, "impact": impact, "top_genes": top_genes, "chromosome": chromosome, "variants": variants}

@app.get("/api/samples/{patient_id}/overview")
def get_sample_overview(patient_id: str, result_type: str = Query("Somatic")):
    return sample_overview(patient_id, result_type)


# ============================================================
# COHORT COMPARISON
# ============================================================

COHORTS = {"CON", "COT", "CTN", "CS"}


def cohort_comparison(left_cohort, right_cohort, result_type=None):
    if left_cohort not in COHORTS or right_cohort not in COHORTS or left_cohort == right_cohort:
        raise HTTPException(status_code=400, detail="Select two different valid cohorts")

    conn = get_connection()
    cursor = conn.cursor()
    filters = " AND result_type=?" if result_type else ""
    filter_params = [result_type] if result_type else []

    def summary(cohort):
        cursor.execute("""SELECT COUNT(*) variants, COUNT(DISTINCT patient_id) samples,
            COUNT(DISTINCT NULLIF(TRIM(SYMBOL), '')) genes, COUNT(DISTINCT NULLIF(TRIM(rsID), '')) rsids
            FROM variants WHERE cohort=?""" + filters, [cohort] + filter_params)
        return dict(cursor.fetchone())

    def values(cohort, column):
        cursor.execute(f"SELECT DISTINCT {column} value FROM variants WHERE cohort=? AND {column} IS NOT NULL AND TRIM({column}) NOT IN ('', '-', 'Unknown')" + filters, [cohort] + filter_params)
        return {str(row["value"]).strip() for row in cursor.fetchall()}

    def grouped(column, label, limit=None):
        suffix = " LIMIT ?" if limit else ""
        cursor.execute(f"""SELECT {column} value,
            SUM(CASE WHEN cohort=? THEN 1 ELSE 0 END) left_count,
            SUM(CASE WHEN cohort=? THEN 1 ELSE 0 END) right_count
            FROM variants WHERE cohort IN (?, ?) AND {column} IS NOT NULL AND TRIM({column}) NOT IN ('', '-', 'Unknown')""" + filters + f" GROUP BY {column} ORDER BY COUNT(*) DESC{suffix}", [left_cohort, right_cohort, left_cohort, right_cohort] + filter_params + ([limit] if limit else []))
        return [{label: clean_value(row["value"]), left_cohort: row["left_count"], right_cohort: row["right_count"]} for row in cursor.fetchall()]

    left_summary, right_summary = summary(left_cohort), summary(right_cohort)
    left_variants, right_variants = values(left_cohort, "CONCAT(CHROM, ':', POS, ':', REF, ':', ALT)"), values(right_cohort, "CONCAT(CHROM, ':', POS, ':', REF, ':', ALT)")
    left_genes, right_genes = values(left_cohort, "SYMBOL"), values(right_cohort, "SYMBOL")
    left_rsids, right_rsids = values(left_cohort, "rsID"), values(right_cohort, "rsID")
    chromosomes = grouped("CHROM", "chromosome")

    def chromosome_order(item):
        value = item["chromosome"].upper().replace("CHR", "")
        if value.isdigit(): return (0, int(value))
        if value == "X": return (1, 23)
        if value == "Y": return (1, 24)
        return (2, value)
    chromosomes.sort(key=chromosome_order)

    cursor.execute("""SELECT cohort, SYMBOL gene, COUNT(*) count FROM variants
        WHERE cohort IN (?, ?) AND SYMBOL IS NOT NULL AND TRIM(SYMBOL) NOT IN ('', '-')""" + filters + " GROUP BY cohort, SYMBOL ORDER BY count DESC", [left_cohort, right_cohort] + filter_params)
    gene_counts = {}
    for row in cursor.fetchall():
        gene_counts.setdefault(row["gene"], {"gene": row["gene"], left_cohort: 0, right_cohort: 0})[row["cohort"]] = row["count"]
    top_genes = sorted(gene_counts.values(), key=lambda item: item[left_cohort] + item[right_cohort], reverse=True)[:10]

    def recent_for(cohort):
        cursor.execute("""SELECT cohort, CHROM, POS, REF, ALT, SYMBOL, rsID, Consequence, IMPACT
            FROM variants WHERE cohort=?""" + filters + " ORDER BY variant_row_id DESC LIMIT 6", [cohort] + filter_params)
        return [dict(row) for row in cursor.fetchall()]
    left_recent, right_recent = recent_for(left_cohort), recent_for(right_cohort)
    recent_variants = [row for pair in zip(left_recent, right_recent) for row in pair] + left_recent[len(right_recent):] + right_recent[len(left_recent):]
    variant_types = grouped("varient_type", "name")
    impact = grouped("IMPACT", "name")
    conn.close()
    return {
        "cohorts": [left_cohort, right_cohort], "summary": {left_cohort: left_summary, right_cohort: right_summary},
        "overlap": {"shared_variants": len(left_variants & right_variants), "left_specific_variants": len(left_variants - right_variants), "right_specific_variants": len(right_variants - left_variants), "shared_genes": len(left_genes & right_genes), "left_specific_genes": len(left_genes - right_genes), "right_specific_genes": len(right_genes - left_genes), "shared_rsids": len(left_rsids & right_rsids), "left_specific_rsids": len(left_rsids - right_rsids), "right_specific_rsids": len(right_rsids - left_rsids)},
        "variant_types": variant_types, "impact": impact, "chromosome": chromosomes, "top_genes": top_genes, "recent_variants": recent_variants
    }


@app.get("/api/cohorts/compare")
def compare_cohorts(left: str, right: str, result_type: str = Query("Both")):
    if result_type not in {"Both", "Somatic", "Germline"}:
        raise HTTPException(status_code=400, detail="result_type must be Both, Somatic, or Germline")
    return cohort_comparison(left.upper(), right.upper(), None if result_type == "Both" else result_type)


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/api/dashboard")
def dashboard():

    conn = get_connection()
    cursor = conn.cursor()

    # --------------------------------------------------------
    # TOTAL SAMPLES
    # --------------------------------------------------------

    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM patients
        """
    )

    total_samples = cursor.fetchone()["total"]


    # --------------------------------------------------------
    # TOTAL VARIANTS
    # --------------------------------------------------------

    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM variants
        """
    )

    total_variants = cursor.fetchone()["total"]


    # --------------------------------------------------------
    # TOTAL GENES
    # --------------------------------------------------------

    cursor.execute(
        """
        SELECT COUNT(DISTINCT SYMBOL) AS total
        FROM variants
        WHERE SYMBOL IS NOT NULL
          AND TRIM(SYMBOL) != ''
        """
    )

    total_genes = cursor.fetchone()["total"]


    # --------------------------------------------------------
    # TOTAL COHORTS
    # --------------------------------------------------------

    cursor.execute(
        """
        SELECT COUNT(DISTINCT cohort) AS total
        FROM variants
        WHERE cohort IS NOT NULL
        """
    )

    total_cohorts = cursor.fetchone()["total"]


    # --------------------------------------------------------
    # DISEASES
    #
    # The supplied sample mapping is the project source of truth for disease.
    # --------------------------------------------------------

    disease_count = dashboard_disease_count()


    # --------------------------------------------------------
    # COHORT DISTRIBUTION
    # --------------------------------------------------------

    cursor.execute(
        """
        SELECT
            cohort,
            COUNT(DISTINCT patient_id) AS samples
        FROM variants
        WHERE cohort IS NOT NULL
        GROUP BY cohort
        ORDER BY cohort
        """
    )

    cohort_distribution = []

    for row in cursor.fetchall():

        cohort_distribution.append({
            # Dashboard terminology uses CN for the cohort stored as CS.
            "name": "CN" if clean_value(row["cohort"]) == "CS" else clean_value(row["cohort"]),
            "samples": row["samples"],
        })


    # --------------------------------------------------------
    # SOMATIC VS GERMLINE
    # --------------------------------------------------------

    cursor.execute(
        """
        SELECT
            result_type,
            COUNT(*) AS count
        FROM variants
        WHERE result_type IS NOT NULL
        GROUP BY result_type
        """
    )

    result_type = []

    for row in cursor.fetchall():

        result_type.append({
            "name": clean_value(row["result_type"]),
            "count": row["count"],
        })


    # --------------------------------------------------------
    # COHORT SUMMARY
    # --------------------------------------------------------

    cursor.execute(
        """
        SELECT
            cohort,
            COUNT(DISTINCT patient_id) AS samples,
            COUNT(*) AS variants,
            COUNT(
                CASE
                    WHEN result_type = 'Somatic'
                    THEN 1
                END
            ) AS somatic,
            COUNT(
                CASE
                    WHEN result_type = 'Germline'
                    THEN 1
                END
            ) AS germline,
            COUNT(DISTINCT SYMBOL) AS genes
        FROM variants
        WHERE cohort IS NOT NULL
        GROUP BY cohort
        ORDER BY cohort
        """
    )

    cohort_summary = []

    for row in cursor.fetchall():

        cohort_summary.append({
            "cohort": "CN" if row["cohort"] == "CS" else row["cohort"],
            "samples": row["samples"],
            "variants": row["variants"],
            "somatic": row["somatic"],
            "germline": row["germline"],
            "genes": row["genes"],
        })


    # --------------------------------------------------------
    # TOP GENES
    # --------------------------------------------------------

    cursor.execute(
        """
        SELECT
            SYMBOL,
            COUNT(*) AS variants
        FROM variants
        WHERE SYMBOL IS NOT NULL
          AND TRIM(SYMBOL) != ''
        GROUP BY SYMBOL
        ORDER BY variants DESC
        LIMIT 10
        """
    )

    top_genes = []

    for row in cursor.fetchall():

        top_genes.append({
            "gene": row["SYMBOL"],
            "variants": row["variants"],
        })


    conn.close()


    return {
        "summary": {
            "total_samples": total_samples,
            "total_variants": total_variants,
            "total_genes": total_genes,
            "total_cohorts": total_cohorts,
            "disease_count": disease_count,
        },

        "cohort_distribution": cohort_distribution,

        "result_type": result_type,

        "cohort_summary": cohort_summary,

        "top_genes": top_genes,
    }


# ============================================================
# GENE VISUALIZATIONS
# ============================================================

@app.get("/api/gene/{gene}/visualizations")
def gene_visualizations(
    gene: str,
    result_type: str = Query(
        "Somatic",
        description="Somatic or Germline"
    )
):

    # --------------------------------------------------------
    # VALIDATE RESULT TYPE
    # --------------------------------------------------------

    if result_type not in ["Somatic", "Germline"]:
        raise HTTPException(
            status_code=400,
            detail="result_type must be Somatic or Germline"
        )


    conn = get_connection()
    cursor = conn.cursor()


    # --------------------------------------------------------
    # CHECK GENE
    #
    # IMPORTANT:
    # We check the gene inside the selected result type.
    # --------------------------------------------------------

    cursor.execute(
        """
        SELECT COUNT(*) AS count
        FROM variants
        WHERE LOWER(SYMBOL) = LOWER(?)
          AND result_type = ?
        """,
        (
            gene,
            result_type
        )
    )

    result = cursor.fetchone()


    if result["count"] == 0:

        conn.close()

        raise HTTPException(
            status_code=404,
            detail=(
                f"Gene '{gene}' has no "
                f"{result_type.lower()} variants"
            )
        )


    # ========================================================
    # BASIC SUMMARY
    # ========================================================

    cursor.execute(
        """
        SELECT
            COUNT(*) AS total_variants,

            COUNT(
                DISTINCT patient_id
            ) AS samples_affected,

            COUNT(
                DISTINCT rsID
            ) AS unique_rsids

        FROM variants

        WHERE LOWER(SYMBOL) = LOWER(?)
          AND result_type = ?
        """,
        (
            gene,
            result_type
        )
    )

    summary = dict(cursor.fetchone())


    # ========================================================
    # CONSEQUENCE
    # ========================================================

    cursor.execute(
        """
        SELECT
            Consequence,
            COUNT(*) AS count

        FROM variants

        WHERE LOWER(SYMBOL) = LOWER(?)
          AND result_type = ?

        GROUP BY Consequence

        ORDER BY count DESC
        """,
        (
            gene,
            result_type
        )
    )

    consequence = []


    for row in cursor.fetchall():

        values = split_annotation(
            row["Consequence"]
        )

        for value in values:

            consequence.append({
                "name": value,
                "count": row["count"]
            })


    # ========================================================
    # EXON
    #
    # Examples:
    #
    # 3/10
    # 5/12
    # 7/10
    #
    # We preserve NUMBER/TOTAL as the category.
    # ========================================================

    cursor.execute(
        """
        SELECT EXON
        FROM variants

        WHERE LOWER(SYMBOL) = LOWER(?)
          AND result_type = ?

          AND EXON IS NOT NULL

          AND TRIM(EXON) != ''
        """,
        (
            gene,
            result_type
        )
    )

    exon_counts = {}


    for row in cursor.fetchall():

        value = clean_value(
            row["EXON"]
        )

        match = re.search(
            r"(\d+)\s*(?:/\s*(\d+))?",
            value
        )

        if match:

            exon_number = match.group(1)
            total_exons = match.group(2)

            if total_exons:

                label = (
                    f"{exon_number}/{total_exons}"
                )

            else:

                label = exon_number

            exon_counts[label] = (
                exon_counts.get(label, 0) + 1
            )


    exon = []

    for key, count in exon_counts.items():

        exon.append({
            "exon": key,
            "count": count
        })


    exon.sort(
        key=lambda x: int(
            re.match(
                r"\d+",
                x["exon"]
            ).group()
        )
    )


    # ========================================================
    # INTRON
    # ========================================================

    cursor.execute(
        """
        SELECT INTRON
        FROM variants

        WHERE LOWER(SYMBOL) = LOWER(?)
          AND result_type = ?

          AND INTRON IS NOT NULL

          AND TRIM(INTRON) != ''
        """,
        (
            gene,
            result_type
        )
    )

    intron_counts = {}


    for row in cursor.fetchall():

        value = clean_value(
            row["INTRON"]
        )

        match = re.search(
            r"(\d+)\s*(?:/\s*(\d+))?",
            value
        )

        if match:

            intron_number = match.group(1)
            total_introns = match.group(2)

            if total_introns:

                label = (
                    f"{intron_number}/{total_introns}"
                )

            else:

                label = intron_number

            intron_counts[label] = (
                intron_counts.get(label, 0) + 1
            )


    intron = []

    for key, count in intron_counts.items():

        intron.append({
            "intron": key,
            "count": count
        })


    intron.sort(
        key=lambda x: int(
            re.match(
                r"\d+",
                x["intron"]
            ).group()
        )
    )


    # ========================================================
    # CLIN_SIG
    # ========================================================

    cursor.execute(
        """
        SELECT
            CLIN_SIG,
            COUNT(*) AS count

        FROM variants

        WHERE LOWER(SYMBOL) = LOWER(?)
          AND result_type = ?

        GROUP BY CLIN_SIG

        ORDER BY count DESC
        """,
        (
            gene,
            result_type
        )
    )

    clin_sig = []


    for row in cursor.fetchall():

        values = split_annotation(
            row["CLIN_SIG"]
        )

        for value in values:

            clin_sig.append({
                "name": value,
                "count": row["count"]
            })


    # ========================================================
    # CHROMOSOME
    # ========================================================

    cursor.execute(
        """
        SELECT
            CHROM AS chromosome,
            COUNT(*) AS count

        FROM variants

        WHERE LOWER(SYMBOL) = LOWER(?)
          AND result_type = ?

        GROUP BY CHROM

        ORDER BY
            CASE
                WHEN CHROM = 'X'
                    THEN 23

                WHEN CHROM = 'Y'
                    THEN 24

                WHEN CHROM = 'MT'
                    THEN 25

                WHEN CAST(CHROM AS INTEGER)
                    > 0

                    THEN CAST(
                        CHROM AS INTEGER
                    )

                ELSE 26
            END
        """,
        (
            gene,
            result_type
        )
    )

    chromosome = []


    for row in cursor.fetchall():

        chromosome.append({
            "chromosome": clean_value(
                row["chromosome"]
            ),

            "count": row["count"]
        })


    # ========================================================
    # ACMG CLASSIFICATION
    # ========================================================

    cursor.execute(
        """
        SELECT
            ACMG_Classification
                AS classification,

            COUNT(*) AS count

        FROM variants

        WHERE LOWER(SYMBOL) = LOWER(?)
          AND result_type = ?

        GROUP BY ACMG_Classification

        ORDER BY count DESC
        """,
        (
            gene,
            result_type
        )
    )

    acmg = []


    for row in cursor.fetchall():

        acmg.append({
            "name": clean_value(
                row["classification"]
            ),

            "count": row["count"]
        })


    cursor.execute("""SELECT cohort, COUNT(*) AS count, COUNT(DISTINCT patient_id) AS samples
        FROM variants WHERE LOWER(SYMBOL) = LOWER(?) AND result_type = ? GROUP BY cohort ORDER BY cohort""", (gene, result_type))
    cohort = [{"name": clean_value(row["cohort"]), "count": row["count"], "samples": row["samples"]} for row in cursor.fetchall()]
    amp = []
    if result_type == "Somatic":
        cursor.execute("""SELECT AMP_Category AS category, COUNT(*) AS count FROM variants
            WHERE LOWER(SYMBOL) = LOWER(?) AND result_type = ? GROUP BY AMP_Category ORDER BY count DESC""", (gene, result_type))
        amp = [{"name": clean_value(row["category"]), "count": row["count"]} for row in cursor.fetchall()]

    conn.close()


    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "gene": gene,

        "result_type": result_type,

        "summary": summary,

        "consequence": consequence,

        "exon": exon,

        "intron": intron,

        "clin_sig": clin_sig,

        "acmg": acmg,
        "amp": amp,
        "cohort": cohort,
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():

    try:

        conn = get_connection()

        conn.execute(
            "SELECT 1"
        )

        conn.close()

        return {
            "status": "ok",
            "database": "connected"
        }

    except Exception as error:

        return {
            "status": "error",
            "database": "not connected",
            "message": str(error)
        }

# ============================================================
# RSID SUMMARY
# ============================================================

@app.get("/api/rsid/{rsid}/summary")
def rsid_summary(rsid: str):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT COUNT(*) AS count
        FROM variants
        WHERE LOWER(rsID) = LOWER(?)
        """,
        (rsid,)
    )

    result = cursor.fetchone()

    if result["count"] == 0:
        conn.close()
        raise HTTPException(
            status_code=404,
            detail=f"RSID '{rsid}' not found"
        )

    cursor.execute(
        """
        SELECT
            result_type,
            COUNT(*) AS count
        FROM variants
        WHERE LOWER(rsID) = LOWER(?)
          AND result_type IN ('Somatic', 'Germline')
        GROUP BY result_type
        """,
        (rsid,)
    )

    somatic_count = 0
    germline_count = 0

    for row in cursor.fetchall():
        if row["result_type"] == "Somatic":
            somatic_count = row["count"]
        elif row["result_type"] == "Germline":
            germline_count = row["count"]

    conn.close()

    return {
        "rsid": rsid,
        "total_variants": result["count"],
        "somatic_count": somatic_count,
        "germline_count": germline_count,
    }


# ============================================================
# RSID VISUALIZATIONS
# ============================================================

@app.get("/api/rsid/{rsid}/visualizations")
def rsid_visualizations(
    rsid: str,
    result_type: str = Query(
        "Somatic",
        description="Somatic or Germline"
    )
):

    if result_type not in ["Somatic", "Germline"]:
        raise HTTPException(
            status_code=400,
            detail="result_type must be Somatic or Germline"
        )

    conn = get_connection()
    cursor = conn.cursor()

    # --------------------------------------------------------
    # CHECK RSID
    # --------------------------------------------------------

    cursor.execute(
        """
        SELECT COUNT(*) AS count
        FROM variants
        WHERE LOWER(rsID) = LOWER(?)
          AND result_type = ?
        """,
        (rsid, result_type)
    )

    result = cursor.fetchone()

    if result["count"] == 0:
        conn.close()
        raise HTTPException(
            status_code=404,
            detail=(
                f"RSID '{rsid}' has no "
                f"{result_type.lower()} variants"
            )
        )

    # ========================================================
    # BASIC SUMMARY
    # ========================================================

    cursor.execute(
        """
        SELECT
            COUNT(*) AS total_variants,
            COUNT(DISTINCT patient_id) AS samples_affected,
            COUNT(DISTINCT rsID) AS unique_rsids
        FROM variants
        WHERE LOWER(rsID) = LOWER(?)
          AND result_type = ?
        """,
        (rsid, result_type)
    )

    summary = dict(cursor.fetchone())

    # ========================================================
    # CONSEQUENCE
    # ========================================================

    cursor.execute(
        """
        SELECT Consequence, COUNT(*) AS count
        FROM variants
        WHERE LOWER(rsID) = LOWER(?)
          AND result_type = ?
        GROUP BY Consequence
        ORDER BY count DESC
        """,
        (rsid, result_type)
    )

    consequence_counts = {}

    for row in cursor.fetchall():
        for value in split_annotation(row["Consequence"]):
            consequence_counts[value] = (
                consequence_counts.get(value, 0) + row["count"]
            )

    consequence = [
        {"name": key, "count": value}
        for key, value in consequence_counts.items()
    ]

    consequence.sort(
        key=lambda x: x["count"],
        reverse=True
    )

    # ========================================================
    # EXON
    # ========================================================

    cursor.execute(
        """
        SELECT EXON
        FROM variants
        WHERE LOWER(rsID) = LOWER(?)
          AND result_type = ?
          AND EXON IS NOT NULL
          AND TRIM(EXON) != ''
        """,
        (rsid, result_type)
    )

    exon_counts = {}

    for row in cursor.fetchall():
        value = clean_value(row["EXON"])

        match = re.search(
            r"(\d+)\s*(?:/\s*(\d+))?",
            value
        )

        if match:
            number = match.group(1)
            total = match.group(2)
            label = f"{number}/{total}" if total else number

            exon_counts[label] = (
                exon_counts.get(label, 0) + 1
            )

    exon = [
        {"exon": key, "count": value}
        for key, value in exon_counts.items()
    ]

    exon.sort(
        key=lambda x: int(
            re.match(r"\d+", x["exon"]).group()
        )
    )

    # ========================================================
    # INTRON
    # ========================================================

    cursor.execute(
        """
        SELECT INTRON
        FROM variants
        WHERE LOWER(rsID) = LOWER(?)
          AND result_type = ?
          AND INTRON IS NOT NULL
          AND TRIM(INTRON) != ''
        """,
        (rsid, result_type)
    )

    intron_counts = {}

    for row in cursor.fetchall():
        value = clean_value(row["INTRON"])

        match = re.search(
            r"(\d+)\s*(?:/\s*(\d+))?",
            value
        )

        if match:
            number = match.group(1)
            total = match.group(2)
            label = f"{number}/{total}" if total else number

            intron_counts[label] = (
                intron_counts.get(label, 0) + 1
            )

    intron = [
        {"intron": key, "count": value}
        for key, value in intron_counts.items()
    ]

    intron.sort(
        key=lambda x: int(
            re.match(r"\d+", x["intron"]).group()
        )
    )

    # ========================================================
    # CLIN_SIG
    # ========================================================

    cursor.execute(
        """
        SELECT CLIN_SIG, COUNT(*) AS count
        FROM variants
        WHERE LOWER(rsID) = LOWER(?)
          AND result_type = ?
        GROUP BY CLIN_SIG
        ORDER BY count DESC
        """,
        (rsid, result_type)
    )

    clin_sig_counts = {}

    for row in cursor.fetchall():
        for value in split_annotation(row["CLIN_SIG"]):
            clin_sig_counts[value] = (
                clin_sig_counts.get(value, 0) + row["count"]
            )

    clin_sig = [
        {"name": key, "count": value}
        for key, value in clin_sig_counts.items()
    ]

    clin_sig.sort(
        key=lambda x: x["count"],
        reverse=True
    )

    # ========================================================
    # CHROMOSOME
    # ========================================================

    cursor.execute(
        """
        SELECT CHROM AS chromosome, COUNT(*) AS count
        FROM variants
        WHERE LOWER(rsID) = LOWER(?)
          AND result_type = ?
        GROUP BY CHROM
        """,
        (rsid, result_type)
    )

    chromosome = []

    for row in cursor.fetchall():
        chromosome.append({
            "chromosome": clean_value(row["chromosome"]),
            "count": row["count"]
        })

    def chromosome_sort(item):
        value = item["chromosome"]

        if value.isdigit():
            return int(value)

        if value.upper() == "X":
            return 23

        if value.upper() == "Y":
            return 24

        if value.upper() == "MT":
            return 25

        return 26

    chromosome.sort(key=chromosome_sort)

    # ========================================================
    # ACMG CLASSIFICATION
    # ========================================================

    cursor.execute(
        """
        SELECT
            ACMG_Classification AS classification,
            COUNT(*) AS count
        FROM variants
        WHERE LOWER(rsID) = LOWER(?)
          AND result_type = ?
        GROUP BY ACMG_Classification
        ORDER BY count DESC
        """,
        (rsid, result_type)
    )

    acmg = []

    for row in cursor.fetchall():
        acmg.append({
            "name": clean_value(row["classification"]),
            "count": row["count"]
        })

    cursor.execute("""SELECT cohort, COUNT(*) AS count, COUNT(DISTINCT patient_id) AS samples
        FROM variants WHERE LOWER(rsID) = LOWER(?) AND result_type = ? GROUP BY cohort ORDER BY cohort""", (rsid, result_type))
    cohort = [{"name": clean_value(row["cohort"]), "count": row["count"], "samples": row["samples"]} for row in cursor.fetchall()]
    amp = []
    if result_type == "Somatic":
        cursor.execute("""SELECT AMP_Category AS category, COUNT(*) AS count FROM variants
            WHERE LOWER(rsID) = LOWER(?) AND result_type = ? GROUP BY AMP_Category ORDER BY count DESC""", (rsid, result_type))
        amp = [{"name": clean_value(row["category"]), "count": row["count"]} for row in cursor.fetchall()]

    conn.close()

    return {
        "rsid": rsid,
        "result_type": result_type,
        "summary": summary,
        "consequence": consequence,
        "exon": exon,
        "intron": intron,
        "clin_sig": clin_sig,
        "acmg": acmg,
        "amp": amp,
        "cohort": cohort,
    }
