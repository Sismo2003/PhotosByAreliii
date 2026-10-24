#!/usr/bin/env bash
# =============================================================================
# Valida la documentación de wiki/ (vault de Obsidian).
#
#   ./validar-docs.sh              # todos los temas
#   ./validar-docs.sh setup-inicial # sólo uno
#
# ERROR (sale != 0): wikilinks que no resuelven a ninguna nota, posibles
#                    secretos, tema ausente del índice maestro.
# AVISO (no falla):  rutas del repo que no existen (puede ser trabajo futuro),
#                    fechas relativas.
# =============================================================================
set -uo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$AQUI/../../.." && pwd)"
DOCS="$REPO/wiki"
FILTRO="${1:-}"

[[ -d "$DOCS" ]] || { echo "No existe $DOCS"; exit 1; }

ERRORES=0; AVISOS=0
err()   { printf '  \033[31m✗ %s\033[0m\n' "$*"; ERRORES=$((ERRORES+1)); }
avisa() { printf '  \033[33m! %s\033[0m\n' "$*"; AVISOS=$((AVISOS+1)); }
ok()    { printf '  \033[32m✓\033[0m %s\n' "$*"; }

# Todas las notas del vault, para resolver wikilinks por nombre de archivo (sin ruta ni extensión)
archivos_vault=()
while IFS= read -r f; do archivos_vault+=("$f"); done < <(find "$DOCS" -name '*.md' -type f)

resuelve_wikilink() {
  local nombre="$1"
  for f in "${archivos_vault[@]}"; do
    [[ "$(basename "$f" .md)" == "$nombre" ]] && return 0
    # README.md de un tema se enlaza por el nombre de su carpeta: [[setup-inicial]] -> setup-inicial/README.md
    if [[ "$(basename "$f")" == "README.md" && "$(basename "$(dirname "$f")")" == "$nombre" ]]; then
      return 0
    fi
  done
  return 1
}

# --- 1. Índice maestro -------------------------------------------------------
echo
echo "══ Índice maestro ══"
if [[ ! -f "$DOCS/README.md" ]]; then
  err "Falta wiki/README.md (índice maestro)"
else
  ok "wiki/README.md existe"
  for d in "$DOCS"/*/; do
    [[ -d "$d" ]] || continue
    tema="$(basename "$d")"
    grep -q "$tema" "$DOCS/README.md" \
      && ok "'$tema' aparece en el índice" \
      || err "'$tema' NO aparece en wiki/README.md"
  done
fi

# --- 2. Por tema -------------------------------------------------------------
for d in "$DOCS"/*/; do
  [[ -d "$d" ]] || continue
  tema="$(basename "$d")"
  [[ -n "$FILTRO" && "$tema" != "$FILTRO" ]] && continue

  echo
  echo "══ Tema: $tema ══"

  [[ -f "$d/README.md" ]] && ok "README.md" || err "$tema: falta README.md"

  archivos=()
  while IFS= read -r f; do archivos+=("$f"); done < <(find "$d" -name '*.md' -type f | sort)

  # 2a. Wikilinks [[nombre]] deben resolver a una nota real del vault
  for f in "${archivos[@]}"; do
    rel="${f#$REPO/}"
    while IFS= read -r destino; do
      [[ -z "$destino" ]] && continue
      destino="${destino%%|*}"   # soporta [[nombre|alias]]
      resuelve_wikilink "$destino" || err "$rel → wikilink roto: [[$destino]]"
    done < <(grep -oE '\[\[[^]]+\]\]' "$f" | sed -E 's/^\[\[//; s/\]\]$//')
  done

  # 2b. Rutas del repositorio citadas entre backticks
  for f in "${archivos[@]}"; do
    rel="${f#$REPO/}"
    while IFS= read -r ruta; do
      [[ -z "$ruta" ]] && continue
      ruta="${ruta%%:*}"
      [[ -e "$REPO/$ruta" ]] || avisa "$rel → no existe (¿trabajo futuro?): $ruta"
    done < <(grep -ohE '`(Backend|Frontend|database|docs|wiki|\.claude)/[A-Za-z0-9_./-]+`' "$f" \
             | tr -d '`' | sort -u)
  done

  # 2c. Fechas relativas
  for f in "${archivos[@]}"; do
    rel="${f#$REPO/}"
    if grep -qiE '\b(ayer|anteayer|la semana pasada|el mes pasado|hace unos días|mañana|la próxima semana)\b' "$f"; then
      avisa "$rel → usa fechas relativas; conviértelas a AAAA-MM-DD"
    fi
  done

  # 2d. Posibles secretos
  for f in "${archivos[@]}"; do
    rel="${f#$REPO/}"
    if grep -qiE '(password|passwd|secret|token|api_?key)[[:space:]]*=[[:space:]]*['\''"]?[A-Za-z0-9/+_-]{8,}' "$f" \
       && ! grep -qiE '(password|passwd|secret|token|api_?key)[[:space:]]*=[[:space:]]*(<|\.\.\.|xxx|tu-|your-|oculto|generada)' "$f"; then
      err "$rel → posible secreto en texto plano; revísalo"
    fi
  done

  # 2e. Plantilla sin rellenar
  for f in "${archivos[@]}"; do
    rel="${f#$REPO/}"
    grep -qE 'AAAA-MM-DD|<tema>|<título corto' "$f" \
      && avisa "$rel → quedan marcadores de plantilla sin rellenar"
  done

  ok "$(printf '%s' "${#archivos[@]}") documento(s) revisado(s)"
done

# --- Resumen -----------------------------------------------------------------
echo
if (( ERRORES == 0 && AVISOS == 0 )); then
  printf '\033[32m══ Documentación válida ══\033[0m\n\n'; exit 0
fi
printf '══ %d error(es), %d aviso(s) ══\n\n' "$ERRORES" "$AVISOS"
(( ERRORES > 0 )) && exit 1
exit 0
