/* ==========================================================================
   Moza · comportamento do site
   Sem dependência. Tudo degrada: sem JavaScript o conteúdo continua legível
   e as perguntas continuam abrindo (details nativo).
   ========================================================================== */
(function () {
  'use strict';

  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- O cubo de roda: fundo do site inteiro ---- */
  var tela = document.querySelector('[data-cubo]');
  var cubo = tela ? new CuboMoza(tela) : null;

  /* ---- O método tensiona os raios: cada etapa centra mais a roda ---- */
  var etapas = [].slice.call(document.querySelectorAll('[data-etapa]'));
  var medidor = document.querySelector('[data-medidor]');
  var valor = document.querySelector('[data-medidor-valor]');
  var veredito = document.querySelector('[data-medidor-veredito]');

  var VEREDITOS = [
    { ate: 0.06, texto: 'no centro',     ciano: true  },
    { ate: 0.30, texto: 'quase no eixo', ciano: false },
    { ate: 0.55, texto: 'girando torto', ciano: false },
    { ate: 0.80, texto: 'desalinhada',   ciano: false },
    { ate: 1.01, texto: 'bamba',         ciano: false }
  ];

  if (cubo && etapas.length) {
    var marcarEtapa = function (alvo) {
      for (var i = 0; i < etapas.length; i++) {
        etapas[i].classList.toggle('etapa--ativa', etapas[i] === alvo);
      }
      cubo.paraDesvio(parseFloat(alvo.dataset.desvio));
    };

    // A etapa ativa é a que está mais perto do centro da tela
    var observador = new IntersectionObserver(function () {
      var meio = window.innerHeight / 2, melhor = null, menor = Infinity;
      for (var i = 0; i < etapas.length; i++) {
        var r = etapas[i].getBoundingClientRect();
        var d = Math.abs((r.top + r.bottom) / 2 - meio);
        if (d < menor) { menor = d; melhor = etapas[i]; }
      }
      if (melhor) marcarEtapa(melhor);
    }, { rootMargin: '-15% 0px -15% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });

    for (var e = 0; e < etapas.length; e++) observador.observe(etapas[e]);

    /* ---- O mostrador acende junto com o método ---- */
    var metodo = document.getElementById('metodo');
    var saindo = null;
    if (medidor && metodo) {
      var porta = new IntersectionObserver(function (entradas) {
        var dentro = entradas[0].isIntersecting;
        if (dentro) {
          clearTimeout(saindo);
          medidor.hidden = false;
          requestAnimationFrame(function () { medidor.classList.add('medidor--vivo'); });
        } else {
          medidor.classList.remove('medidor--vivo');
          saindo = setTimeout(function () { medidor.hidden = true; }, 520);
        }
      }, { rootMargin: '0px', threshold: 0 });
      porta.observe(metodo);

      // Lê o empeno do aro que está girando, umas oito vezes por segundo
      var ultimo = -1;
      setInterval(function () {
        if (medidor.hidden) return;
        var pico = cubo.leitura();
        var agora = Math.round(pico * 100);
        if (agora === ultimo) return;
        ultimo = agora;
        valor.textContent = pico.toFixed(2).replace('.', ',');
        for (var i = 0; i < VEREDITOS.length; i++) {
          if (cubo.desvio <= VEREDITOS[i].ate) {
            veredito.textContent = VEREDITOS[i].texto;
            medidor.classList.toggle('medidor--centrada', VEREDITOS[i].ciano);
            break;
          }
        }
      }, 120);
    }
  }

  /* ---- Revelação ao entrar na tela ---- */
  var reveladores = document.querySelectorAll('.revela');
  if (calmo || !('IntersectionObserver' in window)) {
    for (var r = 0; r < reveladores.length; r++) reveladores[r].classList.add('visivel');
  } else {
    var olho = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e, n) {
        if (!e.isIntersecting) return;
        setTimeout(function () { e.target.classList.add('visivel'); }, n * 90);
        olho.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    for (var v = 0; v < reveladores.length; v++) olho.observe(reveladores[v]);
  }

  /* ---- Topo, e o brilho do cubo ao longo da página ---- */
  var topo = document.querySelector('.topo');
  var hero = document.querySelector('.hero');
  var metodoSec = document.getElementById('metodo');

  var aoRolar = function () {
    topo.classList.toggle('topo--rolado', window.scrollY > 8);
    if (!cubo) return;

    // O acento tem um papel: acende no hero, apaga quando entra o problema,
    // e volta a acender na medida em que o método centra a roda.
    var fimHero = hero ? hero.offsetTop + hero.offsetHeight : window.innerHeight;
    var noHero = 1 - window.scrollY / Math.max(fimHero * 0.75, 1);

    var noMetodo = 0;
    if (metodoSec) {
      var r = metodoSec.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.75 && r.bottom > window.innerHeight * 0.45) {
        noMetodo = 1 - cubo.desvio;
      }
    }
    cubo.acender(Math.max(Math.min(noHero, 1), noMetodo, 0));
  };
  aoRolar();
  window.addEventListener('scroll', aoRolar, { passive: true });

  /* ---- Navegação: marca a seção em que o leitor está ---- */
  var elos = [].slice.call(document.querySelectorAll('.topo__nav a'));
  var secoes = elos.map(function (a) { return document.querySelector(a.getAttribute('href')); });

  if ('IntersectionObserver' in window) {
    var vigia = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        var i = secoes.indexOf(e.target);
        if (i < 0) return;
        if (e.isIntersecting) {
          elos.forEach(function (a, n) { a.setAttribute('aria-current', n === i ? 'true' : 'false'); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secoes.forEach(function (s) { if (s) vigia.observe(s); });
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
