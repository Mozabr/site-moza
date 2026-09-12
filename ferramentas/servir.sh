#!/bin/bash
# Sobe o site da Moza em localhost.
#   4321 = o site, servido igual à Hostinger (raiz = public/)
#   4322 = o kit de seções
# Parar: Ctrl+C, ou  bash ferramentas/servir.sh parar

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "$1" = "parar" ]; then
  pkill -f "http.server 4321" 2>/dev/null
  pkill -f "http.server 4322" 2>/dev/null
  echo "Servidores parados."
  exit 0
fi

# Confere antes de subir: outro projeto na mesma porta e o navegador mostra
# o site errado, e leva um tempo até alguém perceber.
for P in 4321 4322; do
  if lsof -nP -iTCP:$P -sTCP:LISTEN >/dev/null 2>&1; then
    echo "ERRO: a porta $P já está ocupada. Rode 'bash ferramentas/servir.sh parar' ou libere a porta."
    exit 1
  fi
done

cd "$RAIZ/public" && python3 -m http.server 4321 --bind 127.0.0.1 > /dev/null 2>&1 &
cd "$RAIZ"        && python3 -m http.server 4322 --bind 127.0.0.1 > /dev/null 2>&1 &
sleep 1

echo
echo "  Site  ->  http://localhost:4321"
echo "  Kit   ->  http://localhost:4322/kit-de-secoes.html"
echo
echo "  Parar:  bash ferramentas/servir.sh parar"
echo
wait
