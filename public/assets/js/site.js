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
