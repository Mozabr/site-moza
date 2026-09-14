/* ==========================================================================
   Moza · comportamento
   Sem dependência. Tudo degrada: sem JavaScript o conteúdo continua legível,
   a marca aparece acesa e as perguntas continuam abrindo.
   ========================================================================== */
(function () {
  'use strict';

  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- O hero: a luz que revela a marca ---- */
  var hero = document.querySelector('[data-hero]');
  if (hero && window.LuzMoza) new LuzMoza(hero);

  /* ---- Entrada ao rolar. Um movimento por elemento, longo e suave. ---- */
  var entrantes = document.querySelectorAll('.entra');
  if (calmo || !('IntersectionObserver' in window)) {
    for (var i = 0; i < entrantes.length; i++) entrantes[i].classList.add('dentro');
  } else {
    var olho = new IntersectionObserver(function (itens) {
      itens.forEach(function (e, n) {
        if (!e.isIntersecting) return;
        setTimeout(function () { e.target.classList.add('dentro'); }, n * 80);
        olho.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -14% 0px' });
    for (var j = 0; j < entrantes.length; j++) olho.observe(entrantes[j]);
  }

  /* ---- Topo: só ganha fundo depois que a página sai do hero ---- */
  var topo = document.querySelector('.topo');
  var aoRolar = function () {
    topo.classList.toggle('topo--rolado', window.scrollY > window.innerHeight * 0.6);
  };
  aoRolar();
  window.addEventListener('scroll', aoRolar, { passive: true });

  /* ---- Navegação: marca a seção em que o leitor está ---- */
  var elos = [].slice.call(document.querySelectorAll('.topo__nav a'));
  var secoes = elos.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  if ('IntersectionObserver' in window) {
    var vigia = new IntersectionObserver(function (itens) {
      itens.forEach(function (e) {
        var i = secoes.indexOf(e.target);
        if (i < 0 || !e.isIntersecting) return;
        elos.forEach(function (a, n) { a.setAttribute('aria-current', n === i ? 'true' : 'false'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secoes.forEach(function (s) { if (s) vigia.observe(s); });
  }

  /* ---- Duplo: o objeto travado troca de estado a cada batida ---- */
  [].slice.call(document.querySelectorAll('[data-duplo]')).forEach(function (bloco) {
    var batidas = [].slice.call(bloco.querySelectorAll('[data-batida]'));
    var estados = [].slice.call(bloco.querySelectorAll('[data-estado]'));
    if (!batidas.length || !estados.length) return;

    var mostrar = function (i) {
      for (var k = 0; k < estados.length; k++) {
        if (k === i) estados[k].setAttribute('data-vivo', '');
        else estados[k].removeAttribute('data-vivo');
      }
    };
    mostrar(0);

    // A batida ativa é a que está mais perto do meio da tela. Comparar
    // distância ao centro evita o pisca-pisca de quem só escuta entrada e saída.
    var olho = new IntersectionObserver(function () {
      var meio = window.innerHeight / 2, melhor = 0, menor = Infinity;
      for (var i = 0; i < batidas.length; i++) {
        var r = batidas[i].getBoundingClientRect();
        var d = Math.abs((r.top + r.bottom) / 2 - meio);
        if (d < menor) { menor = d; melhor = i; }
      }
      mostrar(melhor);
    }, { threshold: [0, .25, .5, .75, 1], rootMargin: '-10% 0px -10% 0px' });
    batidas.forEach(function (b) { olho.observe(b); });
  });

  /* ---- O chão troca de tom por seção
     A faixa é estreita de propósito: entre #03070B e #050C14 não dá para
     apontar a mudança olhando, só dá para sentir na rolagem longa. ---- */
  var comChao = [].slice.call(document.querySelectorAll('[data-chao]'));
  if (comChao.length && 'IntersectionObserver' in window) {
    var raiz = document.documentElement;
    var porta = new IntersectionObserver(function (itens) {
      var meio = window.innerHeight / 2, alvo = null, menor = Infinity;
      for (var i = 0; i < comChao.length; i++) {
        var r = comChao[i].getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        var d = Math.abs((r.top + r.bottom) / 2 - meio);
        if (d < menor) { menor = d; alvo = comChao[i]; }
      }
      if (!alvo) return;
      raiz.style.setProperty('--chao', alvo.dataset.chao);
      // O cabeçalho é fixo e vive fora das seções, então não herda token
      // nenhum. O tom da seção ativa manda nele por aqui.
      raiz.setAttribute('data-tom', alvo.dataset.tom || 'escuro');
    }, { threshold: [0, .2, .5, .8, 1] });
    comChao.forEach(function (e) { porta.observe(e); });
  }

  /* ---- O acervo: clicar num tópico troca o painel ---- */
  var abas = [].slice.call(document.querySelectorAll('.aba'));
  if (abas.length) {
    var grupos = [].slice.call(document.querySelectorAll('.acervo__grupo'));
    var abrir = function (i) {
      abas.forEach(function (a, n) { a.setAttribute('aria-selected', n === i ? 'true' : 'false'); });
      grupos.forEach(function (g, n) {
        if (n === i) g.setAttribute('data-vivo', '');
        else g.removeAttribute('data-vivo');
      });
    };
    abas.forEach(function (a, i) {
      a.addEventListener('click', function () { abrir(i); });
      // Seta navega entre abas, como manda o padrão de tablist
      a.addEventListener('keydown', function (ev) {
        var d = ev.key === 'ArrowDown' || ev.key === 'ArrowRight' ? 1
              : ev.key === 'ArrowUp' || ev.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        ev.preventDefault();
        var n = (i + d + abas.length) % abas.length;
        abrir(n); abas[n].focus();
      });
    });
  }

  /* ---- Perguntas: abre uma por vez ---- */
  var perguntas = [].slice.call(document.querySelectorAll('.pergunta'));
  perguntas.forEach(function (p) {
    p.addEventListener('toggle', function () {
      if (!p.open) return;
      perguntas.forEach(function (o) { if (o !== p) o.open = false; });
    });
  });
})();

/* ==========================================================================
   A emenda e o campo
   Rodam depois do site.js principal para já encontrar o DOM montado.
   ========================================================================== */
(function () {
  'use strict';

  /* A emenda lê a cor do irmão de cima. Assim a passagem entre faixas se
     corrige sozinha se a ordem das seções mudar, e nenhuma cor fica escrita
     em dois lugares. */
  [].slice.call(document.querySelectorAll('.secao,.rodape')).forEach(function (s) {
    var ant = s.previousElementSibling;
    /* O rodapé vem depois do <main>: o vizinho real dele é a última faixa
       lá dentro, não o main. */
    if (ant && !ant.hasAttribute('data-chao')) {
      var d = ant.querySelectorAll('[data-chao]');
      ant = d.length ? d[d.length - 1] : null;
    }
    var de = ant && ant.getAttribute('data-chao');
    if (de) s.style.setProperty('--de', de);
  });

  if (window.CampoMoza) {
    [].slice.call(document.querySelectorAll('[data-campo]')).forEach(window.CampoMoza);
  }
})();

/* ==========================================================================
   O portal
   Uma variável de rolagem (0 a 1) alimenta todas as camadas do palco. O M
   anda em linha reta no eixo Z e a perspectiva faz a aceleração sozinha, que
   é o que separa aproximação de câmera de crescimento de keyframe.
   ========================================================================== */
(function () {
  'use strict';
  var trilho = document.querySelector('[data-portal]');
  if (!trilho) return;
  var palco = trilho.querySelector('.portal__palco');
  if (!palco) return;

  function fatia(v, a, b) { return Math.min(1, Math.max(0, (v - a) / (b - a))); }
  function suave(t) { return t * t * (3 - 2 * t); }
  function po(n, v) { palco.style.setProperty(n, v); }

  function pintar(p) {
    /* O M: caminho reto de longe (-500) até passar a câmera (1020). A curva
       de tamanho é a perspectiva, não uma função escrita aqui. */
    var z = -500 + Math.pow(fatia(p, 0, .54), 1.22) * 1520;
    po('--mZ', z.toFixed(1));
    po('--mOp', (1 - fatia(z, 600, 1005)).toFixed(3));
    po('--mBorr', (fatia(z, 470, 1020) * 13).toFixed(2));

    /* O texto vem do mesmo longe de onde o M saiu, com foco chegando junto. */
    var t = suave(fatia(p, .30, .80));
    po('--tZ', (-1600 + t * 1600).toFixed(1));
    po('--tOp', fatia(t, 0, .40).toFixed(3));
    po('--tBorr', ((1 - fatia(t, 0, .60)) * 16).toFixed(2));

    /* O estouro de luz na passagem, para a troca ter um momento e não um corte. */
    po('--luz', (suave(Math.max(0, 1 - Math.abs(p - .47) / .17)) * .8).toFixed(3));
  }

  palco.classList.add('portal--vivo');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { pintar(1); return; }

  var pedido = 0, naTela = true;
  function medir() {
    pedido = 0;
    var r = trilho.getBoundingClientRect();
    var curso = r.height - window.innerHeight;
    pintar(curso <= 0 ? 1 : Math.min(1, Math.max(0, -r.top / curso)));
  }
  function agendar() { if (!pedido && naTela) pedido = requestAnimationFrame(medir); }

  new IntersectionObserver(function (e) {
    naTela = e[0].isIntersecting;
    agendar();
    if (!naTela) medir();          // deixa o último quadro certo ao sair de vista
  }, { rootMargin: '150px' }).observe(trilho);

  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar);
  medir();
})();
