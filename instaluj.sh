#!/usr/bin/env bash
# Instaluje albo aktualizuje Page Tweaks prosto z GitHuba, bez gita
# (macOS, Linux). Pierwszy raz i przy każdej aktualizacji to samo:
#
#   curl -fsSL https://raw.githubusercontent.com/Adam-M-04/page-tweaks/master/instaluj.sh | bash
#
# albo, gdy już jest zainstalowane: bash ~/Rozszerzenia/page-tweaks/instaluj.sh
set -euo pipefail

REPO="Adam-M-04/page-tweaks"
GALAZ="master"
CEL="${PAGE_TWEAKS_DIR:-$HOME/Rozszerzenia/page-tweaks}"

wersja() { sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$1/manifest.json" 2>/dev/null | head -1 || true; }

main() {
  # Nie nadpisujemy cudzego katalogu — tylko własną instalację.
  if [ -e "$CEL" ] && ! grep -qs '"name": *"Page Tweaks"' "$CEL/manifest.json"; then
    echo "$CEL istnieje, ale to nie Page Tweaks — przerywam." >&2
    exit 1
  fi

  mkdir -p "$(dirname "$CEL")"
  # Katalog tymczasowy obok celu, żeby podmiana była zwykłym mv.
  tmp="$(mktemp -d "$(dirname "$CEL")/.page-tweaks.XXXXXX")"
  trap 'rm -rf "$tmp"' EXIT

  echo "Pobieram $REPO ($GALAZ)…"
  curl -fsSL "https://github.com/$REPO/archive/refs/heads/$GALAZ.zip" -o "$tmp/paczka.zip"
  # Komentarz archiwum z GitHuba to SHA commita.
  commit="$(unzip -z "$tmp/paczka.zip" | tail -1)"
  if [ -f "$CEL/.wersja" ] && [ "$(cat "$CEL/.wersja")" = "$commit" ]; then
    echo "Page Tweaks jest aktualne ($(wersja "$CEL"), ${commit:0:7})."
    exit 0
  fi

  unzip -q "$tmp/paczka.zip" -d "$tmp/rozpakowane"
  zrodlo="$(find "$tmp/rozpakowane" -mindepth 1 -maxdepth 1 -type d | head -1)"
  [ -f "$zrodlo/manifest.json" ] || { echo "W paczce nie ma manifest.json — przerywam." >&2; exit 1; }
  rm -rf "$zrodlo/test"
  echo "$commit" > "$zrodlo/.wersja"

  stara="$(wersja "$CEL")"
  [ -e "$CEL" ] && mv "$CEL" "$tmp/poprzednia"
  mv "$zrodlo" "$CEL"
  nowa="$(wersja "$CEL")"

  if [ -z "$stara" ]; then
    echo "Zainstalowane w $CEL ($nowa, ${commit:0:7})."
    echo
    echo "Raz, ręcznie w Chrome:"
    echo "  1. chrome://extensions → włącz Tryb programisty (prawy górny róg)"
    echo "  2. Wczytaj rozpakowane → wskaż $CEL"
    if command -v pbcopy >/dev/null; then
      printf %s "$CEL" | pbcopy
      echo "     (ścieżka jest w schowku: w oknie wyboru Cmd+Shift+G i wklej)"
      open -a "Google Chrome" "chrome://extensions" 2>/dev/null || true
    fi
  else
    echo "Zaktualizowane: $stara → $nowa (${commit:0:7})."
    echo "W chrome://extensions kliknij ⟳ przy Page Tweaks albo zrestartuj Chrome."
  fi
}

main "$@"
