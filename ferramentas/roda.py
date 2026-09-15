# -*- coding: utf-8 -*-
"""Gera a roda da Moza em vetor, a partir da roda de F1 de referência.

O que faz uma roda desenhada parecer real não é contorno, é luz. Aqui a luz
vem de uma direção só (canto superior esquerdo) e **todas** as peças usam o
mesmo eixo de gradiente em userSpaceOnUse. É isso que amarra o objeto: se cada
peça tem a sua própria luz, o olho lê desenho; se todas dividem a mesma, lê
material.

Em cima disso vêm as três coisas que o desenho vetorial costuma esquecer:
o brilho especular no ombro do pneu, o escuro de contato (oclusão) onde as
peças se encontram, e a luz de recorte na borda oposta à fonte.

Raios: oito, em quatro pares opostos, um par por raio do método. Largos o
bastante para a face do aro ler como metal com oito janelas, não como palitos.
"""
import math

C = 230.0
PARES = [(0, 180), (45, 225), (90, 270), (135, 315)]
LUZ = 225.0                      # de onde vem a luz, em graus SVG (y para baixo)

def pt(ang, r):
    a = math.radians(ang)
    return C + math.cos(a) * r, C + math.sin(a) * r

def arco(r, ini, fim, larg=0):
    x1, y1 = pt(ini, r); x2, y2 = pt(fim, r)
    grande = 1 if (fim - ini) % 360 > 180 else 0
    return 'M%.1f,%.1f A%.1f,%.1f 0 %d 1 %.1f,%.1f' % (x1, y1, r, r, grande, x2, y2)

def _quad(ang, ri, ro, wi, wo):
    p = math.radians(ang + 90)
    px, py = math.cos(p), math.sin(p)
    cix, ciy = pt(ang, ri); cox, coy = pt(ang, ro)
    return ((cix + px*wi, ciy + py*wi), (cox + px*wo, coy + py*wo),
            (cox - px*wo, coy - py*wo), (cix - px*wi, ciy - py*wi))

def raio(ang):
    """A lâmina: estreita no cubo, larga no aro, com um degrau no pé."""
    A, B, Cc, D = _quad(ang, 54, 152, 6.5, 13)
    return ('M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f L%.1f,%.1f Z'
            % (A[0],A[1], B[0],B[1], Cc[0],Cc[1], D[0],D[1]))

def aresta(ang, luz=True):
    """Fio de luz na face voltada para a fonte, fio escuro na face oposta.
       É o que dá espessura à lâmina sem desenhar espessura nenhuma."""
    n1, n2 = (ang + 90) % 360, (ang - 90) % 360
    d1 = math.cos(math.radians(n1 - LUZ))
    lado = n1 if (d1 > 0) == luz else n2
    sinal = 1 if lado == (ang + 90) % 360 else -1
    p = math.radians(ang + 90)
    px, py = math.cos(p) * sinal, math.sin(p) * sinal
    cix, ciy = pt(ang, 54); cox, coy = pt(ang, 152)
    return ('M%.1f,%.1f L%.1f,%.1f' % (cix + px*6.5, ciy + py*6.5, cox + px*13, coy + py*13))

def montar(variante):
    L = []; A = L.append
    A('<svg class="roda roda--%s" viewBox="0 0 460 460" aria-hidden="true">' % variante)
    A('  <ellipse class="roda__chao" cx="230" cy="430" rx="170" ry="20"/>')
    A('  <g class="roda__corpo">')

    # ---- PNEU ------------------------------------------------------------
    A('    <circle class="roda__pneu" cx="230" cy="230" r="194"/>')
    # Relevo do flanco: anéis concêntricos finos, como borracha moldada.
    for r in (172, 182, 206, 216):
        A('    <circle class="roda__flanco" cx="230" cy="230" r="%d"/>' % r)
    # Especular no ombro, do lado da luz. É o brilho que diz "isto é borracha".
    A('    <path class="roda__brilhoPneu" d="%s"/>' % arco(210, 178, 262))
    # Luz de recorte na borda oposta, fraca e fria.
    A('    <path class="roda__recorte" d="%s"/>' % arco(219, 8, 74))
    # Contato entre pneu e aro: o escuro que separa as duas peças.
    A('    <circle class="roda__oclusao" cx="230" cy="230" r="166"/>')

    # ---- FAIXA -----------------------------------------------------------
    A('    <path class="roda__faixa" d="%s"/>' % arco(194, 196, 294))
    A('    <path class="roda__faixa" d="%s"/>' % arco(194, 330, 66))

    # ---- POÇO E FREIO ----------------------------------------------------
    A('    <circle class="roda__poco" cx="230" cy="230" r="152"/>')
    A('    <circle class="roda__disco" cx="230" cy="230" r="118"/>')
    # Anel de furos do disco. Discreto: neste tamanho detalhe demais vira ruído.
    A('    <circle class="roda__furos" cx="230" cy="230" r="98"/>')
    A('    <circle class="roda__discoBorda" cx="230" cy="230" r="118"/>')

    # ---- ARO -------------------------------------------------------------
    A('    <circle class="roda__aro" cx="230" cy="230" r="158"/>')
    A('    <path class="roda__aroLuz" d="%s"/>' % arco(158, 186, 268))

    # ---- RAIOS -----------------------------------------------------------
    for k, par in enumerate(PARES):
        A('    <g class="roda__par" style="--r:var(--r%d,0)">' % (k + 1))
        for ang in par:
            A('      <path class="roda__raio" d="%s"/>' % raio(ang))
        for ang in par:
            A('      <path class="roda__raioSombra" d="%s"/>' % aresta(ang, luz=False))
            A('      <path class="roda__raioLuz" d="%s"/>' % aresta(ang, luz=True))
        A('    </g>')

    # ---- CENTRO ----------------------------------------------------------
    if variante == 'monta':
        A('    <circle class="roda__cubo" cx="230" cy="230" r="52"/>')
        A('    <circle class="roda__cuboLuz" cx="230" cy="230" r="52"/>')
        A('    <circle class="roda__porca" cx="230" cy="230" r="17"/>')
        A('    <circle class="roda__porcaLuz" cx="223" cy="223" r="6"/>')
    else:
        A('    <circle class="roda__oco" cx="230" cy="230" r="52"/>')

    A('  </g>')
    A('</svg>')
    return '\n        '.join(L)

if __name__ == '__main__':
    import sys
    print(montar(sys.argv[1]))
