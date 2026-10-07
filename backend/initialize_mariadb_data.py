"""One-time/import-on-demand MariaDB loader for project-provided panel and disease data."""

import csv
from pathlib import Path

from database import get_connection


BASE_DIR = Path(__file__).resolve().parent


def nonempty(value):
    value = (value or "").strip()
    return value or None


def initialize_gene_panels(cursor):
    source = BASE_DIR / "gene_panels.csv"
    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        headers = next(reader)
        panels = [(index, header.strip()) for index, header in enumerate(headers) if header.strip()]
        genes_by_panel = {index: [] for index, _ in panels}
        for row in reader:
            for index, _ in panels:
                if index < len(row) and (gene := row[index].strip()):
                    genes_by_panel[index].append(gene)

    cursor.execute(
        """CREATE TABLE IF NOT EXISTS gene_panels (
            panel_id INT NOT NULL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            display_order INT NOT NULL,
            gene_count INT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"""
    )
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS gene_panel_genes (
            entry_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            panel_id INT NOT NULL,
            gene VARCHAR(255) NOT NULL,
            display_order INT NOT NULL,
            KEY idx_gene_panel_order (panel_id, display_order),
            CONSTRAINT fk_gene_panel_genes_panel
                FOREIGN KEY (panel_id) REFERENCES gene_panels(panel_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"""
    )
    cursor.execute("DELETE FROM gene_panel_genes")
    cursor.execute("DELETE FROM gene_panels")
    cursor.executemany(
        "INSERT INTO gene_panels (panel_id, name, display_order, gene_count) VALUES (?, ?, ?, ?)",
        [(index, name, index, len(genes_by_panel[index])) for index, name in panels],
    )
    cursor.executemany(
        "INSERT INTO gene_panel_genes (panel_id, gene, display_order) VALUES (?, ?, ?)",
        [
            (panel_id, gene, order)
            for panel_id, _ in panels
            for order, gene in enumerate(genes_by_panel[panel_id])
        ],
    )
    return len(panels), sum(len(genes) for genes in genes_by_panel.values())


def populate_patient_diagnoses(cursor):
    """Apply only exact CSV Sample ID -> non-empty Organ Type mappings."""
    source = BASE_DIR / "sample_diseases.csv"
    updates = []
    with source.open("r", encoding="cp1252", newline="") as handle:
        for row in csv.DictReader(handle):
            patient_id = nonempty(row.get("Sample ID"))
            diagnosis = nonempty(row.get("Organ Type"))
            if patient_id and diagnosis:
                updates.append((diagnosis, patient_id))
    cursor.executemany(
        "UPDATE patients SET diagnosis=? WHERE patient_id=?",
        updates,
    )
    return cursor.rowcount


def main():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("START TRANSACTION")
        panel_count, gene_count = initialize_gene_panels(cursor)
        diagnosis_updates = populate_patient_diagnoses(cursor)
        conn.commit()
        print(f"Imported {panel_count} panels and {gene_count} gene entries; updated {diagnosis_updates} patient diagnoses.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
