#!/usr/bin/env bash
# run-e2e-matrix.sh
# Dispara N jobs E2E en paralelo — un job por flujo × dispositivo.
#
# Uso:
#   ./scripts/run-e2e-matrix.sh                   # todos los flujos, QA, ambos dispositivos
#   ./scripts/run-e2e-matrix.sh -f F-05,F-12      # solo esos flujos
#   ./scripts/run-e2e-matrix.sh -e prod            # contra producción
#   ./scripts/run-e2e-matrix.sh -d escritorio      # solo escritorio
#   ./scripts/run-e2e-matrix.sh -f F-01 -d móvil  # un flujo, un dispositivo
#
# Requisitos:
#   gh CLI autenticado (gh auth status)
#   jq instalado (brew install jq)

set -euo pipefail

REPO="cbdavid14/tunay-wasi-landing"
WORKFLOW="e2e-report.yml"

# --- Defaults ---------------------------------------------------------------
FLOWS_INPUT="all"
ENVIRONMENT="qa"
DISPOSITIVOS=("escritorio" "móvil")

# --- Parsear args -----------------------------------------------------------
while getopts "f:e:d:" opt; do
  case $opt in
    f) FLOWS_INPUT="$OPTARG" ;;
    e) ENVIRONMENT="$OPTARG" ;;
    d) DISPOSITIVOS=("$OPTARG") ;;
    *) echo "Uso: $0 [-f flujos] [-e qa|prod] [-d escritorio|móvil]"; exit 1 ;;
  esac
done

# --- Expandir "all" a lista completa ----------------------------------------
ALL_FLOWS="F-01 F-02 F-03 F-04 F-05 F-06 F-07 F-08 F-09 F-10 F-11 F-12 F-13"

if [ "$FLOWS_INPUT" = "all" ]; then
  FLOWS=($ALL_FLOWS)
else
  IFS=',' read -ra FLOWS <<< "$FLOWS_INPUT"
fi

# --- Verificar prerrequisitos ------------------------------------------------
if ! command -v gh &>/dev/null; then
  echo "ERROR: gh CLI no encontrado. Instalar: brew install gh"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "ERROR: gh CLI no autenticado. Correr: gh auth login"
  exit 1
fi

# --- Disparar jobs -----------------------------------------------------------
TOTAL=$(( ${#FLOWS[@]} * ${#DISPOSITIVOS[@]} ))
COUNT=0
declare -a RUN_IDS

echo ""
echo "Disparando $TOTAL jobs E2E en paralelo"
echo "  Flujos: ${FLOWS[*]}"
echo "  Dispositivos: ${DISPOSITIVOS[*]}"
echo "  Ambiente: $ENVIRONMENT"
echo ""

for FLOW in "${FLOWS[@]}"; do
  for DEVICE in "${DISPOSITIVOS[@]}"; do
    COUNT=$((COUNT + 1))
    printf "[%2d/%d] %-6s × %-12s → " "$COUNT" "$TOTAL" "$FLOW" "$DEVICE"

    gh workflow run "$WORKFLOW" \
      --repo "$REPO" \
      -f flows="$FLOW" \
      -f dispositivo="$DEVICE" \
      -f environment="$ENVIRONMENT" \
      -f bail="false" 2>&1

    # Pausa mínima para evitar rate-limiting de GitHub API (10 req/s)
    sleep 0.3
  done
done

echo ""
echo "Todos los dispatches enviados."
echo ""
echo "Ver progreso:"
echo "  https://github.com/$REPO/actions/workflows/$WORKFLOW"
echo ""

# --- Esperar y resumir resultados -------------------------------------------
echo "Esperando 90s para que los runs aparezcan en la API..."
sleep 90

echo ""
echo "Estado de los últimos $TOTAL runs:"
echo ""

gh run list \
  --repo "$REPO" \
  --workflow "$WORKFLOW" \
  --limit "$TOTAL" \
  --json "databaseId,status,conclusion,name,createdAt" \
  --jq '.[] | "\(.status | ascii_upcase) \(.conclusion // "running") | \(.name) | \(.createdAt)"' \
  | head -"$TOTAL"

echo ""
FAILURES=$(gh run list \
  --repo "$REPO" \
  --workflow "$WORKFLOW" \
  --limit "$TOTAL" \
  --json "conclusion" \
  --jq '[.[] | select(.conclusion == "failure")] | length')

PENDING=$(gh run list \
  --repo "$REPO" \
  --workflow "$WORKFLOW" \
  --limit "$TOTAL" \
  --json "status" \
  --jq '[.[] | select(.status != "completed")] | length')

echo "Resumen:"
echo "  En progreso : $PENDING"
echo "  Fallidos    : $FAILURES"
echo "  Completados : $((TOTAL - PENDING))"
echo ""

if [ "$PENDING" -gt 0 ]; then
  echo "Runs aún en curso — ver resultados finales en:"
  echo "  https://github.com/$REPO/actions/workflows/$WORKFLOW"
fi
