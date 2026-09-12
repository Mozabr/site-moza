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
