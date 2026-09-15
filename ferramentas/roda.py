# -*- coding: utf-8 -*-
"""Gera a roda da Moza em vetor, a partir da roda de F1 que o Kauan mandou.

O que vem da referência: a proporção (pneu gordo, aro pequeno), a lâmina de
raio que afina no cubo e engorda no aro, o disco furado aparecendo por trás,
e a faixa colorida na lateral do pneu.

O que é nosso: a faixa é ciano, não amarela, e não tem marca de ninguém
escrita nela. Oito raios em quatro pares opostos, um par por raio do método,
que é como se aperta roda de verdade.
"""
import math

C = 230.0              # centro do quadro
PARES = [(0,180),(45,225),(90,270),(135,315)]

def pt(ang, r):
    a = math.radians(ang)
    return C + math.cos(a)*r, C + math.sin(a)*r

def lamina(ang):
    """Raio: estreito no cubo, largo no aro. É o que dá a leitura de lâmina."""
    ri, ro = 58.0, 152.0
    wi, wo = 6.5, 13.5
    p = ang + 90
    cix, ciy = pt(ang, ri); cox, coy = pt(ang, ro)
    px, py = math.cos(math.radians(p)), math.sin(math.radians(p))
    A = (cix + px*wi, ciy + py*wi)
    B = (cox + px*wo, coy + py*wo)
    Cc= (cox - px*wo, coy - py*wo)
    D = (cix - px*wi, ciy - py*wi)
    return ('M%.1f,%.1f L%.1f,%.1f A%.1f,%.1f 0 0 1 %.1f,%.1f L%.1f,%.1f A%.1f,%.1f 0 0 0 %.1f,%.1f Z'
            % (A[0],A[1], B[0],B[1], wo,wo, Cc[0],Cc[1], D[0],D[1], wi,wi, A[0],A[1]))

def arco(r, ini, fim):
    x1,y1 = pt(ini, r); x2,y2 = pt(fim, r)
    grande = 1 if (fim-ini) % 360 > 180 else 0
    return 'M%.1f,%.1f A%.1f,%.1f 0 %d 1 %.1f,%.1f' % (x1,y1, r,r, grande, x2,y2)

def montar(variante):
    """variante 'oca' = espelho (sem cubo, com o vazio marcado).
       variante 'monta' = método (o cubo primeiro, os pares depois)."""
    L = []
    A = L.append
    A('<svg class="roda roda--%s" viewBox="0 0 460 460" aria-hidden="true">' % variante)
    A('  <g class="roda__corpo">')

    # Pneu: um traço grosso que se enrola no aro conforme --pneu sobe.
    A('    <circle class="roda__pneu" cx="230" cy="230" r="194"/>')
    A('    <circle class="roda__sulco" cx="230" cy="230" r="212"/>')

    # A faixa da lateral. Dois arcos, como a marcação de composto na referência.
    A('    <path class="roda__faixa" d="%s"/>' % arco(194, 196, 294))
    A('    <path class="roda__faixa" d="%s"/>' % arco(194, 330, 66))

    # O poço do aro: o fundo escuro que se vê entre os raios. Sem ele a roda
    # vira aro com palitos e o fundo da página vaza pelo meio.
    A('    <circle class="roda__poco" cx="230" cy="230" r="152"/>')

    # Disco de freio por trás, com a carreira de furos.
    A('    <circle class="roda__disco" cx="230" cy="230" r="118"/>')
    A('    <circle class="roda__furos" cx="230" cy="230" r="96"/>')

    # Aro
    A('    <circle class="roda__aro" cx="230" cy="230" r="158"/>')

    # Raios, em quatro pares opostos. Par por par é como roda se aperta.
    for k, par in enumerate(PARES):
        A('    <g class="roda__par" style="--r:var(--r%d,0)">' % (k+1))
        for ang in par:
            A('      <path class="roda__raio" d="%s"/>' % lamina(ang))
        A('    </g>')

    if variante == 'monta':
        A('    <circle class="roda__cubo" cx="230" cy="230" r="52"/>')
        A('    <circle class="roda__porca" cx="230" cy="230" r="17"/>')
    else:
        # O centro que ninguém construiu. Tracejado porque é ausência.
        A('    <circle class="roda__oco" cx="230" cy="230" r="52"/>')

    A('  </g>')
    A('</svg>')
    return '\n        '.join(L)

if __name__ == '__main__':
    import sys
    print(montar(sys.argv[1]))
