#!/bin/bash

# Purpose: Docker HEALTHCHECK — prüft ob der OpenSIN-Chat-Server (Port 3001)
#          antwortet UND ob die PDF-Analyse-Subsysteme (Storage, Job-Store)
#          lesbar/beschreibbar sind.
# Docs:    (kein .doc.md noetig — reines Bash-Glue, Logik trivial)
#
# Aufgerufen vom Docker-Daemon alle 1m (siehe HEALTHCHECK in docker/Dockerfile).

set -u

STORAGE_DIR="${STORAGE_DIR:-/app/server/storage}"
PDF_DIR="${STORAGE_DIR}/pdf-analysis"
JOBS_DIR="${PDF_DIR}/jobs"
FACTS_DB="${PDF_DIR}/facts.sqlite"

# ── 1) Liveness: HTTP /ping muss 200 liefern ──────────────────────
response=$(curl --write-out '%{http_code}' --silent --output /dev/null --max-time 5 http://localhost:3001/ping)
if [ "$response" -ne 200 ]; then
  echo "Server is down (ping HTTP $response)"
  exit 1
fi

# ── 2) PDF-Storage: Verzeichnis anlegen falls fehlend, dann prüfen ──
# Das Verzeichnis wird vom Server on-demand angelegt (beim ersten PDF-Analysis-Job).
# Der Healthcheck darf hier nicht scheitern, nur weil noch niemand PDFs analysiert hat.
mkdir -p "$PDF_DIR"
if [ ! -d "$PDF_DIR" ]; then
  echo "PDF-Storage konnte nicht angelegt werden: $PDF_DIR"
  exit 1
fi
if [ ! -w "$PDF_DIR" ]; then
  echo "PDF-Storage nicht schreibbar: $PDF_DIR"
  exit 1
fi

# ── 3) Job-Store: jobs/ Verzeichnis muss existieren und lesbar sein ──
# Korrupte Job-JSONs wuerden resumeInterrupted() beim Serverstart werfen;
# wir pruefen hier, dass das Verzeichnis zugreifbar ist. Einzelne .json-
# Dateien werden vom JobStore selbst mit try/catch geladen.
if [ -d "$JOBS_DIR" ]; then
  if [ ! -r "$JOBS_DIR" ]; then
    echo "Job-Store nicht lesbar: $JOBS_DIR"
    exit 1
  fi
fi

# ── 4) Facts-Store: facts.sqlite muss lesbar sein (oder fehlen) ──
if [ -f "$FACTS_DB" ]; then
  if [ ! -r "$FACTS_DB" ]; then
    echo "Facts-Store nicht lesbar: $FACTS_DB"
    exit 1
  fi
fi

  echo "Server is up; PDF-Storage und Job/Facts-Store OK"
exit 0
