#!/usr/bin/env bash
# Build the FREE lead-magnet PDF "Cómo empezar a hacer trading desde Chile"
# from its Markdown source. This is the giveaway guide (Part 1 "map" only), NOT
# the paid book. Run from anywhere.
#
#   bash book-projects/como-hacer-trading-desde-chile/lead-magnet/build.sh
#
# Requires: pandoc (brew install pandoc) and Calibre (brew install --cask calibre).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
BOOK="$HERE/../manuscript"                # reuse the book's stylesheet
OUT="$REPO/blob-uploads/lead-magnets/como-empezar-trading-desde-chile/es"
EBC="/Applications/calibre.app/Contents/MacOS/ebook-convert"
BASENAME="como-empezar-trading-desde-chile"

# Fall back to a PATH ebook-convert if the macOS app bundle isn't present.
if [ ! -x "$EBC" ]; then EBC="$(command -v ebook-convert)"; fi

mkdir -p "$OUT"

echo "==> pandoc: Markdown -> EPUB (intermediate)"
# --split-level=6: keep the whole guide in ONE EPUB spine file. Each section's
# new page comes from the CSS `page-break-before: always` on h1; splitting at
# level 1 as well produced a double break and stray blank pages (page ~6, ~16).
pandoc "$HERE/metadata.yaml" "$HERE/manuscript.md" \
  -o "$OUT/$BASENAME.epub" \
  --toc --toc-depth=1 \
  --split-level=6 \
  --resource-path="$HERE" \
  --css="$HERE/guide.css"

echo "==> calibre: EPUB -> PDF (6x9, page numbers)"
"$EBC" "$OUT/$BASENAME.epub" "$OUT/$BASENAME.pdf" \
  --title "Cómo empezar a hacer trading desde Chile" \
  --authors "Chris Ruzicka" \
  --language es \
  --extra-css "$HERE/guide-print.css" \
  --pdf-serif-family "Georgia" \
  --pdf-sans-family "Helvetica" \
  --pdf-default-font-size 15 \
  --pdf-page-margin-top 54 --pdf-page-margin-bottom 54 \
  --pdf-page-margin-left 56 --pdf-page-margin-right 56 \
  --custom-size 6x9 --unit inch \
  --pdf-page-numbers >/dev/null

# The EPUB was only an intermediate for Calibre; the deliverable is the PDF.
rm -f "$OUT/$BASENAME.epub"

echo "==> done. File in: $OUT"
ls -la "$OUT/$BASENAME.pdf"
