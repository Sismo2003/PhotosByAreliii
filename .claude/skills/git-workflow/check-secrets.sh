#!/usr/bin/env bash
# Pre-commit check for this public repo. Scans what is staged (or, with --all, what `git add -A`
# would add) for secrets, personal data, photos/docs and big files. Exit 1 on any finding.
# Usage: .claude/skills/git-workflow/check-secrets.sh [--all]
set -u
cd "$(git rev-parse --show-toplevel)" || exit 2

if [ "${1:-}" = "--all" ]; then
  FILES=$(git add -A -n | sed -E "s/^add '(.*)'$/\1/")
else
  FILES=$(git diff --cached --name-only --diff-filter=ACMR)
fi
[ -z "$FILES" ] && { echo "Nada que revisar."; exit 0; }

bad=0
fail() { echo "✗ $1"; bad=1; }

# 1. Forbidden file names / extensions
echo "$FILES" | grep -E '(^|/)\.env($|\.)|\.(pem|key|crt|p12|pfx|jpe?g|png|webp|heic|gif|pdf|docx|xlsx|zip|dump|sqlite3?|db|log)$|(^|/)(Backend/storage|Backend/uploads|node_modules|dist)/|pass-temp' \
  | grep -vE '\.env\.example$|\.env\.development$|(admin|client)/public/favicon\.png$' \
  | while read -r f; do echo "✗ archivo prohibido: $f"; done | grep . && bad=1

# 2. Big files (> 2 MB)
echo "$FILES" | while read -r f; do
  [ -f "$f" ] && [ "$(wc -c < "$f")" -gt 2097152 ] && echo "✗ archivo grande (>2MB): $f"
done | grep . && bad=1

# 3. Content patterns (text files only)
TEXT=$(echo "$FILES" | grep -vE 'package-lock\.json$|\.onnx$')
scan() { # label, regex, optional exclude regex
  hits=$(echo "$TEXT" | while read -r f; do [ -f "$f" ] && grep -InE "$2" "$f" 2>/dev/null | sed "s#^#$f:#" ; done \
    | { [ -n "${3:-}" ] && grep -vE "$3" || cat; } | cut -c1-140)
  [ -n "$hits" ] && { echo "✗ $1"; echo "$hits" | sed 's/^/    /' | head -8; bad=1; }
}
scan "llave privada / token" '-----BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|xox[bp]-|sk_(live|test)_|AIza[0-9A-Za-z_-]{30,}|SG\.[A-Za-z0-9_-]{20,}'
scan "asignación de secreto con valor literal" '(JWT_SECRET|GALLERY_ENC_KEY|CF_API_TOKEN|SMTP_PASS(WORD)?|DATABASE_URL)\s*=\s*[^<$ #"'"'"'][^ ]{7,}' 'example|changeme|<|localhost|pba:pba|root:root|\$\{|process\.env'
scan "correo que no es de ejemplo" '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.(com|net|org|mx|io)\b' 'example\.(com|org)|noreply|@types|@[a-z-]+/|\.test\b|you@email|tu@correo|photosbyareliii@|nimbuscloud'
scan "teléfono real (usa 555-01xx)" '\(?[2-9][0-9]{2}\)?[ .-][0-9]{3}[ .-][0-9]{4}|\+1[2-9][0-9]{9}' '555[ .-]?01|555[ .-]?0[1-9]|555[ .-]?1[0-9]'

if [ $bad -eq 0 ]; then echo "✓ Sin hallazgos."; else echo; echo "Corrige o saca del índice antes de commitear."; exit 1; fi
