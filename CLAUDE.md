# Site da Moza · mozabr.com.br

Site institucional da Moza Assessoria. Uma página só, com âncoras. O objetivo
é único: gerar conversa no WhatsApp.

## Fonte de verdade

Este projeto não decide marca nem copy. Ele executa o que já está decidido:

- Tokens (cor, tipografia, espaçamento): seção 06 de
  `../next-cerebro/marca/rebranding/fontes/brandbook-moza.md`
- Estrutura e argumento: `../next-cerebro/marca/rebranding/fontes/arquitetura-site.md`
- Copy oficial: `../next-cerebro/marca/rebranding/fontes/kit-comunicacao.md`
- Copy do Marketing 360: `../next-cerebro/marca/rebranding/fontes/copy-360-site.md`
  (escrito pelo Murillo em 10/09/2026, com as regras de onde entra e o que não
  pode). Escopo que sustenta: `../next-cerebro/marca/produto-360.md`
- Tom de voz: `../next-cerebro/marca/rebranding/fontes/tom-de-voz.md`
- O desenho fechado seção a seção: `kit-de-secoes.html` (abrir no navegador)

Mudou alguma coisa de marca? Muda lá primeiro, depois aqui. Nunca o contrário.

## Regras invioláveis do conteúdo

- Nunca travessão. Vírgula, dois-pontos, parênteses ou ponto.
- Nenhuma exclamação no site.
- Caixa alta só em etiqueta e sigla, nunca para dar ênfase.
- Zero preço, zero prazo, zero comparativo de plano.
- Nunca "nosso time", "nossa equipe" nem plural de fachada. É "a Moza", "nós",
  ou o nome do sócio.
- Palavras banidas: garantido, explosivo, revolucionário, fórmula, segredo,
  alavancar, acelerar, turbinar, pisar fundo, o melhor do mercado.
- As etapas são Centro (Diagnóstico) e Raio 1 a 4 (Posicionamento, Conteúdo,
  Venda, Jornada). Nunca numeradas de 01 a 05.

## Regras técnicas

- HTML e CSS estáticos. Sem framework, sem etapa de build, sem npm no site.
  A pasta `public/` é literalmente o que sobe para a Hostinger.
- Fontes servidas do próprio domínio (`public/assets/fonts/`), variáveis,
  51 KB para Jost e Manrope inteiras. Nunca chamar o Google Fonts.
- Ciano `#00B4FF` tem teto de 5% da área em qualquer dobra. Um acento, nunca dois.
- Todo filho direto de grid leva `min-width:0`. Coluna `1fr` vale
  `minmax(auto,1fr)` e o item mais largo estica a coluna para fora da tela.
- Todo link de WhatsApp com a mensagem já preenchida.
- `prefers-reduced-motion` respeitado: o giro cai para 40% e o argumento
  continua de pé só pelo texto.
- Nada de `backdrop-filter` em elemento que fique por cima do cubo. Ele cria
  raiz de fundo e recorta o que está atrás numa borda dura, o que faz o cubo
  aparecer picado nas frestas entre cartões.

## Publicar na Hostinger

1. hPanel, Gerenciador de arquivos, pasta `public_html` do domínio `mozabr.com.br`.
2. Subir **o conteúdo de `public/`** (não a pasta), incluindo o `.htaccess`.
3. Conferir no celular de verdade antes de divulgar.

Refazer o cartão de compartilhamento depois de mexer no texto do hero:

```
python3 -m http.server 8899 &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --window-size=1200,630 --virtual-time-budget=3000 \
  --screenshot=public/assets/img/og-moza.png http://127.0.0.1:8899/ferramentas/og.html
```

## O acervo (`#acervo`)

Padrão "Explore os detalhes" da Apple: tópicos clicáveis de um lado, a obra do
outro. É `role="tablist"` de verdade, com seta navegando entre abas.

As imagens são **dobras de sites de clientes que estão no ar**, recortadas dos
prints em `../../Prints Sites Portfólio/` por `bash ferramentas/portfolio.sh`.
O print original tem a página inteira (até 16.000px); o que serve de prova é a
primeira tela, que é o que o visitante do cliente vê.

**Só entra obra que está no ar.** A frase da seção promete isso: "Tudo aqui
está no ar, em cliente real." Se tirar um site do ar, tira do acervo.

Cada tópico tem cor própria, **toda dentro da família do azul**: `#0071AD`,
`#0096DC`, `#00B4FF`. Dá vida sem abrir um segundo acento, que o brandbook
proíbe. Hue estranho (laranja, roxo como a Apple usa) quebraria a regra.

## Os portais (o espelho e o método)

Duas seções são palcos travados na tela: o espelho e o método. Cada cena
atravessa a profundidade, nasce longe e desfocada, chega ao plano da página,
fica, e recua enquanto a próxima já vem vindo.

A escala do M **não é escrita à mão**. Ele anda em linha reta no eixo Z
(`translateZ`, de -500px a 1020px) e quem faz a aceleração é a perspectiva de
1200px do palco. A curva é a hipérbole `1200/(1200-z)`, de graça, e é o que
separa aproximação de câmera de crescimento de keyframe.

**A altura do trilho não está no CSS.** Ela sai de `número de cenas × passo`,
escrita pelo `site.js`. Acrescentar ou tirar uma cena no HTML não pede conta
nova: só mexa em `data-portal-passo` se quiser o percurso mais curto ou mais
longo (hoje 105 no espelho, 90 no método, em svh por cena).

**A classe `portal--vivo` troca o modo de layout inteiro**, não só a animação.
Sem ela (sem JS, ou com `prefers-reduced-motion`) o palco é fluxo normal: as
cenas ficam uma embaixo da outra e a roda fica parada e montada. Por isso os
valores da roda têm padrão 1 no CSS: o motor escreve os mesmos nomes no style
do elemento e ganha por ser inline.

Não pôr `overflow:hidden` no trilho (`.portal`): mata o `sticky` do palco. Ele
vai no palco, que é o próprio elemento travado.

### A roda, um componente e dois argumentos

Feita a partir de uma roda de F1 que o Kauan mandou de referência (12/09/2026).
O que veio de lá: a proporção (pneu gordo, aro pequeno), a lâmina de raio que
afina no cubo e engorda no aro, o disco furado por trás, e a faixa de cor na
lateral do pneu. **O que é nosso: a faixa é ciano e não tem marca de ninguém
escrita nela.** Nada de Pirelli, Enkei ou Brembo no desenho, que seria marca de
terceiro num site comercial.

Oito raios em quatro pares opostos, um par por raio do método. Roda se aperta
par a par, nunca raio a raio, então cada etapa fecha um par e a roda fica
equilibrada em todo passo da montagem.

No **espelho** ela monta sem cubo (`.roda--oca`): pneu, aro, raios, faixa. Os
raios terminam no ar, o meio fica marcado por um anel tracejado em ciano, ela
treme, e no fim sai de tela rolando para a direita (`--sai`). No **método**
(`.roda--monta`) o cubo é a primeira peça, cada etapa prende um par nele, e o
pneu entra por último, na Jornada, que é a etapa de sustentar o resultado.

O `.roda__poco` é o fundo escuro entre os raios. Sem ele a roda vira aro com
palitos e o fundo da página vaza pelo meio.

O desenho sai de `ferramentas/roda.py` (gerador). Mexeu na geometria? Rode o
gerador e troque os dois `<svg class="roda ...">` do index.

## A barra de rolagem da casa

Substitui a do sistema só em ponteiro fino (`hover:hover and pointer:fine`).
Em toque a nativa já se esconde sozinha e uma barra fixa na borda atrapalharia.

Ela não é um tubo com um bastão: é um mapa. Uma marca por seção (`[data-chao]`),
a marca da seção atual acesa em ciano, clique pula para lá, e o punho arrasta.
Numa página com dois trechos travados isso é orientação, não enfeite.

## Gradiente de SVG mora em SVG que sempre existe

Os `<linearGradient>` do M ficam no `<svg>` do **portal**, não no do objeto
travado. O objeto travado é `display:none` abaixo de 900px, e um paint server
dentro de subárvore escondida não resolve: o path fica sem tinta e o M
simplesmente não aparece. Isso pegava todo visitante de celular, que é a
maioria. Se mover os defs de novo, conferir em 393px antes de subir.

## O site rola suave, a sonda não pode

`html` tem `scroll-behavior:smooth`. Qualquer `scrollTo` de ferramenta precisa
de `behavior:'instant'`, senão a captura sai de um ponto do caminho em vez do
destino e você passa a tarde caçando um defeito que não existe. Isso já custou
tempo duas vezes: uma culpando imagem que carrega tarde, outra achando que a
animação não chegava ao fim.

## Armadilha da sonda de QA

Alvo de toque se mede por `offsetWidth`/`offsetHeight`, **nunca** por
`getBoundingClientRect()`. O retângulo vem já transformado, e o `rotateX` da
animação de profundidade achata a medida: dá falso positivo de alvo pequeno em
elemento que tem 46px de layout. Isso custou tempo uma vez.

## O que ainda falta no site

- `assets/img/pratica/`: três capturas anonimizadas (mapa mental, deck, painel).
  Trocar os blocos `.artefato__vazio` do index por `<img>`.
- `assets/img/socios/`: retratos do Kauan e do Murillo. Trocar o svg do
  `.socio__retrato` por `<img>`. Sem eles a seção sobe com o marcador da marca.
