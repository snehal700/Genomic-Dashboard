# MariaDB runtime

The Genomic Portal uses MariaDB as its only runtime data store. Configure the
`MARIADB_HOST`, `MARIADB_PORT`, `MARIADB_DATABASE`, `MARIADB_USER`, and
`MARIADB_PASSWORD` environment variables before starting the API.

Install backend dependencies with `pip install -r requirements.txt`, then start
FastAPI with `python -m uvicorn main:app --reload`.

`initialize_mariadb_data.py` imports the project-provided gene-panel and sample
disease source files into MariaDB. It is an import utility, not part of normal
API runtime. The dashboard Excel importer validates input and updates MariaDB
within a transaction.
