#!/usr/bin/env bash
# Prepara as fotos da obra para o site, a partir dos masters em 4K do cérebro.
#
# Servir 4K literal no navegador é erro: são megabytes por imagem e o browser
# joga fora o excedente. O certo é gerar larguras responsivas em WebP a partir
# do master, e deixar o <img srcset> escolher. Em tela retina o resultado tem
# nitidez de 4K pesando dezenas de KB.
#
# Uso: bash ferramentas/imagens.sh
set -uo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FONTE="$AQUI/../next-cerebro/marketing/fotos-lojas-de-veiculos/originais"
DESTINO="$AQUI/public/assets/img/obra"


mkdir -p "$DESTINO"

# Cada foto pede o que ela usa na página, não o máximo possível.
# A do pátio tem paralelepípedo, detalhe de alta frequência que infla o
# arquivo, então ela pede qualidade menor sem perder nada visível.
processar() {          # origem  nome  larguras  qualidade
  local src="$1" nome="$2" LARGURAS="$3" QUALIDADE="$4"
  [ -f "$src" ] || { echo "  FALTA: $src"; return; }
  local w h
  w=$(sips -g pixelWidth  "$src" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$src" | awk '/pixelHeight/{print $2}')
  echo "  $nome  (master ${w}x${h})"
  for L in $LARGURAS; do
    if [ "$L" -gt "$w" ]; then continue; fi
    magick "$src" -auto-orient -resize "${L}x" -strip \
           -colorspace sRGB -quality 92 "/tmp/moza-$nome-$L.png" 2>/dev/null
    cwebp -quiet -q $QUALIDADE -m 6 "/tmp/moza-$nome-$L.png" -o "$DESTINO/$nome-$L.webp"
    magick "/tmp/moza-$nome-$L.png" -quality 80 -sampling-factor 4:2:0 \
           -interlace JPEG "$DESTINO/$nome-$L.jpg" 2>/dev/null
    rm -f "/tmp/moza-$nome-$L.png"
    printf "    %5dpx  webp %5s  jpg %5s\n" "$L" \
      "$(du -h "$DESTINO/$nome-$L.webp" | cut -f1)" \
      "$(du -h "$DESTINO/$nome-$L.jpg"  | cut -f1)"
  done
}

echo "Fotos da obra, a partir dos masters:"
processar "$FONTE/via-brasil.jpeg"  "via-brasil-fachada" "1024 1600" 80
processar "$FONTE/capa.jpeg"        "patio-drone"        "640 1024"  70
processar "$FONTE/producao-01.jpeg" "producao-loja"      "640 1024"  80

echo
echo "Total em $DESTINO: $(du -sh "$DESTINO" | cut -f1)"
