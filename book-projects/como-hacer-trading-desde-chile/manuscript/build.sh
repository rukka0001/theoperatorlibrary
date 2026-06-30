#!/usr/bin/env bash
# Regenerate all three book formats for "Cómo hacer trading desde Chile"
# from the single Markdown source. Run from anywhere.
#
#   bash book-projects/como-hacer-trading-desde-chile/manuscript/build.sh
#
# Requires: pandoc (brew install pandoc) and Calibre (brew install --cask calibre).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
OUT="$REPO/blob-uploads/books/como-hacer-trading-desde-chile/es"
COVER="$REPO/public/images/books/como-hacer-trading-desde-chile/cover_new.png"
EBC="/Applications/calibre.app/Contents/MacOS/ebook-convert"

mkdir -p "$OUT"

echo "==> pandoc: Markdown -> EPUB"
pandoc "$HERE/metadata.yaml" "$HERE/manuscript.md" \
  -o "$OUT/como-hacer-trading-desde-chile.epub" \
  --toc --toc-depth=2 \
  --split-level=2 \
  --resource-path="$HERE" \
  --epub-cover-image="$COVER" \
  --css="$HERE/book.css"

# Let Apple Books control fonts/size (pandoc defaults to locking them). This
# keeps the EPUB cleanly reflowable in Apple Books.
DISP_TMP="$(mktemp -d)"
mkdir -p "$DISP_TMP/META-INF"
cat > "$DISP_TMP/META-INF/com.apple.ibooks.display-options.xml" <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<display_options>
  <platform name="*">
    <option name="specified-fonts">false</option>
  </platform>
</display_options>
XML
(cd "$DISP_TMP" && zip -X "$OUT/como-hacer-trading-desde-chile.epub" \
  "META-INF/com.apple.ibooks.display-options.xml" >/dev/null)
rm -rf "$DISP_TMP"

echo "==> calibre: EPUB -> AZW3"
"$EBC" "$OUT/como-hacer-trading-desde-chile.epub" "$OUT/como-hacer-trading-desde-chile.azw3" \
  --title "Cómo hacer trading desde Chile" \
  --authors "Chris Ruzicka" \
  --language es >/dev/null

# Full-bleed PDF cover: crop cover_new.png to the 6x9 page aspect (2:3) so it
# fills the whole page with no white bands and no distortion. Centered crop of
# the larger dimension; cover_new.png itself is left untouched.
COVER_PDF="$HERE/.cover-fullbleed.png"
CW=$(sips -g pixelWidth "$COVER" | awk '/pixelWidth/{print $2}')
CH=$(sips -g pixelHeight "$COVER" | awk '/pixelHeight/{print $2}')
TARGET_W=$(awk "BEGIN{printf \"%d\", $CH*6.0/9.0}")
if [ "$TARGET_W" -le "$CW" ]; then
  sips -c "$CH" "$TARGET_W" "$COVER" --out "$COVER_PDF" >/dev/null
else
  TARGET_H=$(awk "BEGIN{printf \"%d\", $CW*9.0/6.0}")
  sips -c "$TARGET_H" "$CW" "$COVER" --out "$COVER_PDF" >/dev/null
fi

echo "==> calibre: EPUB -> PDF (premium, 6x9 trade paperback, full-bleed cover)"
"$EBC" "$OUT/como-hacer-trading-desde-chile.epub" "$OUT/como-hacer-trading-desde-chile.pdf" \
  --title "Cómo hacer trading desde Chile" \
  --authors "Chris Ruzicka" \
  --language es \
  --cover "$COVER_PDF" \
  --extra-css "$HERE/print-extra.css" \
  --pdf-serif-family "Georgia" \
  --pdf-sans-family "Helvetica" \
  --pdf-default-font-size 15 \
  --pdf-page-margin-top 54 --pdf-page-margin-bottom 54 \
  --pdf-page-margin-left 56 --pdf-page-margin-right 56 \
  --custom-size 6x9 --unit inch \
  --pdf-page-numbers >/dev/null

rm -f "$COVER_PDF"
echo "==> done. Files in: $OUT"
ls -la "$OUT"/*.pdf "$OUT"/*.epub "$OUT"/*.azw3
