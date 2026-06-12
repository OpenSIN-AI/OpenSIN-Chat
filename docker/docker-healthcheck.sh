#!/bin/bash

# Purpose: Docker HEALTHCHECK — prüft ob der AnythingLLM-Server (Port 3001)
#          antwortet UND ob die PDF-Analyse-Subsysteme (Storage, Job-Store)
#          lesbar/beschreibbar sind.
# Docs:    (kein .doc.md noetig — reines Bash-Glue, Logik trivial)
#
# Aufgerufen vom Docker-Daemon alle 1m (siehe HEALTHCHECK in docker/Dockerfile).

set -u

STORAGE_DIR="${STORAGE_DIR:-/app/server/storage}"
PDF_DIR="${STORAGE_DIR}/pdf-analysis"
JOBS_FILE="${PDF_DIR}/jobs.json"
FACTS_FILE="${PDF_DIR}/facts.json"

# ── 1) Liveness: HTTP /api/ping muss 200 liefern ─────────────────
response=$(curl --write-out '%{http_code}' --silent --output /dev/null --max-time 5 http://localhost:3001/api/ping)
if [ "$response" -ne 200 ]; then
  echo "Server is down (ping HTTP $response)"
  exit 1
fi

# ── 2) PDF-Storage: Verzeichnis muss existieren + schreibbar sein ──
# Schlaegt fehl, wenn das Volume nicht gemountet wurde oder Permissions
# verbogen sind — genau der Fall, in dem der Healthcheck greifen muss.
if [ ! -d "$PDF_DIR" ]; then
  echo "PDF-Storage fehlt: $PDF_DIR"
  exit 1
fi
if [ ! -w "$PDF_DIR" ]; then
  echo "PDF-Storage nicht schreibbar: $PDF_DIR"
  exit 1
fi

# ── 3) Job-Store: jobs.json muss valides JSON sein (oder fehlen) ──
# Korrupte jobs.json wuerde resumeInterrupted() beim Serverstart werfen;
# wir fangen das hier ab, bevor der Container "healthy" gemeldet wird.
if [ -f "$JOBS_FILE" ]; then
  if ! python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$JOBS_FILE" 2>/dev/null; then
    echo "Job-Store korrupt: $JOBS_FILE"
    exit 1
  fi
fi

# ── 4) Facts-Store: facts.json muss valides JSON sein (oder fehlen) ──
if [ -f "$FACTS_FILE" ]; then
  if ! python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$FACTS_FILE" 2>/dev/null; then
    echo "Facts-Store korrupt: $FACTS_FILE"
    exit 1
  fi
fi

echo "Server is up; PDF-Storage und Job-Store OK"
exit 0
