#!/usr/bin/env bash
# Recorta a dobra de cada print de site de cliente e gera as larguras do site.
# O print original tem a página inteira (até 16000px de altura); o que serve
# como prova é a primeira tela, que é o que o visitante do cliente vê.
set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$AQUI/../../Prints Sites Portfólio"
DESTINO="$AQUI/public/assets/img/obra"
mkdir -p "$DESTINO"

recorta() {   # arquivo  nome  altura-do-recorte
  local f="$SRC/$1" nome="$2" alt="${3:-1580}"
  [ -f "$f" ] || { echo "  FALTA: $1"; return; }
  local w; w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  magick "$f" -crop "${w}x${alt}+0+0" +repage -resize 1280x -strip -colorspace sRGB \
         -quality 92 "/tmp/pf-$nome.png" 2>/dev/null
  cwebp -quiet -q 80 -m 6 "/tmp/pf-$nome.png" -o "$DESTINO/$nome-1280.webp"
  magick "/tmp/pf-$nome.png" -resize 720x -quality 80 "$DESTINO/$nome-720.jpg" 2>/dev/null
  cwebp -quiet -q 78 -m 6 "$DESTINO/$nome-720.jpg" -o "$DESTINO/$nome-720.webp"
  magick "/tmp/pf-$nome.png" -quality 82 "$DESTINO/$nome-1280.jpg" 2>/dev/null
  rm -f "/tmp/pf-$nome.png"
  printf "  %-22s %5s / %5s\n" "$nome" "$(du -h "$DESTINO/$nome-720.webp" | cut -f1)" "$(du -h "$DESTINO/$nome-1280.webp" | cut -f1)"
}

echo "Dobras dos sites de cliente:"
recorta "www.duartereisadvogados.com.br_.png" "site-duarte-reis"
recorta "psibrunorocha.com.br_.png"           "site-bruno-rocha"
recorta "diskaguaaraujo.com.br_.png"          "site-disk-agua"
recorta "consorcios.plan10.com.br_ (1).png"   "site-plan10"
echo
echo "Total: $(du -sh "$DESTINO" | cut -f1)"
