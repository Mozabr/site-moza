#!/usr/bin/env python3
"""Monta uma versão de arquivo único (CSS, JS e logo embutidos, fontes pelo
Google Fonts) para publicar como página compartilhável.

Uso: python3 ferramentas/montar-artefato.py <entrada.html> <saida.html>
"""
import io, re, sys, os, base64

ENTRADA, SAIDA = sys.argv[1], sys.argv[2]
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = io.open(os.path.join(RAIZ, ENTRADA), encoding='utf-8').read()
base = 'public/' if not ENTRADA.startswith('public/') else 'public/'

def ler(rel):
    return io.open(os.path.join(RAIZ, 'public', rel), encoding='utf-8').read()

# Folhas de estilo na ordem em que o documento pede, sem as @font-face locais
folhas = re.findall(r'<link rel="stylesheet" href="(?:public/)?assets/css/([^"]+)"', html)
css = "\n".join(re.sub(r"@font-face\{[^}]*\}\n?", "", ler('assets/css/' + f)) for f in folhas)

# Scripts do próprio site, na ordem
scripts = re.findall(r'<script src="(?:public/)?assets/js/([^"]+)"></script>', html)
js = "\n".join(ler('assets/js/' + s) for s in scripts)

titulo = re.search(r'<title>(.*?)</title>', html, re.S).group(1).strip()
estilo_local = re.search(r'<style>\n(.*?)\n</style>', html, re.S)
corpo = re.search(r'<body>\n(.*?)\n</body>', html, re.S).group(1)

# Tira as chamadas externas e os comentários de obra: o conteúdo vai embutido
corpo = re.sub(r'<script src="[^"]+"></script>\s*', '', corpo)
corpo = re.sub(r'<!--.*?-->\s*', '', corpo, flags=re.S)

# Logo embutido, sem o <title> interno (conflita com o título da página).
# Aceita atributo antes do src e mais de uma variante de wordmark.
def trocar_logo(m):
    tag = m.group(0)
    arq = re.search(r'src="(?:public/)?(assets/img/logo/[^"]+\.svg)"', tag).group(1)
    svg = re.sub(r'\s*<title>.*?</title>', '',
                 io.open(os.path.join(RAIZ, 'public', arq), encoding='utf-8').read(), flags=re.S)
    larg = re.search(r'width="(\d+)"', tag)
    classe = re.search(r'class="([^"]*)"', tag)
    svg = svg.replace('width="780" height="176"',
        'style="width:%spx;height:auto"' % (larg.group(1) if larg else '104'))
    if classe:
        svg = svg.replace('<svg ', '<svg class="%s" ' % classe.group(1), 1)
    return svg

corpo = re.sub(r'<img[^>]*src="(?:public/)?assets/img/logo/[^"]+\.svg"[^>]*>', trocar_logo, corpo)

# Fotos embutidas como data URI: o CSP do artefato bloqueia imagem externa.
# Vai só o menor tamanho de cada uma, que é o suficiente para revisão.
def embutir(m):
    bloco = m.group(0)
    abre = re.match(r'<picture[^>]*>', bloco).group(0)
    alvo = re.search(r'srcset="(?:public/)?(assets/img/[^ "]+\.webp)', bloco)
    if not alvo:
        return bloco
    caminho = os.path.join(RAIZ, 'public', alvo.group(1))
    dados = base64.b64encode(open(caminho, 'rb').read()).decode()
    img = re.search(r'<img[^>]*>', bloco, re.S).group(0)
    for atr in ('src', 'srcset', 'sizes'):
        img = re.sub(r'\s%s="[^"]*"' % atr, '', img)
    img = img.replace('<img', '<img src="data:image/webp;base64,%s"' % dados, 1)
    # O <picture> fica: a classe dele carrega o posicionamento do hero
    return abre + img + '</picture>'

corpo = re.sub(r'<picture[^>]*>.*?</picture>', embutir, corpo, flags=re.S)

assert 'assets/' not in corpo, 'sobrou referência a arquivo externo: ' + \
    re.search(r'[^"]*assets/[^"]*', corpo).group(0)

pagina = f"""<title>{titulo}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&family=Manrope:wght@400;500;700&display=swap">
<style>
{css}
{estilo_local.group(1) if estilo_local else ''}
/* A marca é de fundo escuro por decisão: a peça não inverte com o tema do leitor */
html{{background:var(--breu)}}
</style>
{corpo}
<script>
{js}
</script>
"""
io.open(SAIDA, 'w', encoding='utf-8').write(pagina)
print(f"{SAIDA}  {len(pagina)//1024} KB  ({len(folhas)} css, {len(scripts)} js)")
