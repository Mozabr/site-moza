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
   Um palco travado na tela por várias alturas de rolagem. Cada cena atravessa
   a profundidade: nasce longe e desfocada, chega ao plano da página, fica, e
   recua enquanto a próxima já vem vindo.

   A altura do trilho não está escrita no CSS: ela sai do número de cenas vezes
   o passo. Assim dá para acrescentar ou tirar uma cena no HTML sem recalcular
   nada à mão.

   Sem JS a classe portal--vivo nunca entra, o palco fica parado e as cenas
   ficam empilhadas e legíveis. O argumento continua de pé.
   ========================================================================== */
(function () {
  'use strict';
  var trilhos = [].slice.call(document.querySelectorAll('[data-portal]'));
  if (!trilhos.length) return;
  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fatia(v, a, b) { return Math.min(1, Math.max(0, (v - a) / (b - a))); }
  function suave(t) { return t * t * (3 - 2 * t); }

  function montar(trilho) {
    var palco = trilho.querySelector('.portal__palco');
    if (!palco) return null;
    var oM    = trilho.querySelector('.portal__m');
    var oLuz  = trilho.querySelector('.portal__luz');
    var roda  = trilho.querySelector('.roda');
    var cenas = [].slice.call(trilho.querySelectorAll('.portal__cena'));
    var comM  = trilho.hasAttribute('data-portal-m');
    var passo = parseInt(trilho.getAttribute('data-portal-passo') || '100', 10);
    var vagas = cenas.length + (comM ? 1 : 0);
    var s     = 1 / vagas;                         // quanto vale uma vaga
    var monta = roda && roda.classList.contains('roda--monta');

    if (!calmo) {
      /* Só quem vai animar vira palco travado. Quem pediu menos movimento fica
         com as cenas em fluxo normal, uma embaixo da outra, tudo legível. */
      var estreito = window.matchMedia('(max-width:899px)').matches;
      trilho.style.height = Math.round(vagas * passo * (estreito ? .86 : 1)) + 'svh';
      palco.classList.add('portal--vivo');
    }

    function po(el, n, v) { el.style.setProperty(n, v); }

    function pintar(p) {
      /* O M: linha reta no eixo Z. A curva de tamanho é a perspectiva, não uma
         função escrita aqui, e é isso que faz parecer câmera. */
      if (oM) {
        var z = -500 + Math.pow(fatia(p, 0, s * .94), 1.22) * 1520;
        po(oM, '--mZ', z.toFixed(1));
        po(oM, '--mOp', (1 - fatia(z, 600, 1005)).toFixed(3));
        po(oM, '--mBorr', (fatia(z, 470, 1020) * 13).toFixed(2));
        if (oLuz) po(oLuz, '--luz',
          (suave(Math.max(0, 1 - Math.abs(p - s * .88) / (s * .34))) * .8).toFixed(3));
      }

      cenas.forEach(function (c, i) {
        var centro = ((comM ? 1 : 0) + i + .5) * s;
        var ent = suave(fatia(p, centro - .78 * s, centro - .06 * s));
        var sai = i === cenas.length - 1 ? 0
                : suave(fatia(p, centro + .26 * s, centro + .95 * s));
        po(c, '--z',   (-1500 * (1 - ent) + 860 * sai).toFixed(1));
        po(c, '--op',  (fatia(ent, 0, .42) * (1 - fatia(sai, 0, .55))).toFixed(3));
        po(c, '--borr', (16 * (1 - ent) + 15 * sai).toFixed(2));
      });

      if (!roda) return;
      if (monta) {
        /* O método monta a roda na ordem em que a gente trabalha: o cubo
           primeiro, cada etapa prende um par de raios nele, e o pneu entra por
           último, na Jornada, que é a etapa de sustentar o resultado. */
        po(roda, '--cubo', suave(fatia(p, s * 1.05, s * 1.75)).toFixed(3));
        po(roda, '--a',    suave(fatia(p, s * 2.0,  s * 5.4)).toFixed(3));
        for (var k = 0; k < 4; k++) {
          po(roda, '--r' + (k + 1),
             suave(fatia(p, s * (k + 2.05), s * (k + 2.65))).toFixed(3));
        }
        po(roda, '--pneu',  suave(fatia(p, s * 5.15, s * 5.75)).toFixed(3));
        po(roda, '--faixa', suave(fatia(p, s * 5.45, s * 5.9)).toFixed(3));
      } else {
        /* O espelho monta a roda inteira menos o cubo, faz ela tremer, mostra
           o buraco no meio e manda ela embora rolando para a direita. */
        po(roda, '--cubo', '0');
        po(roda, '--pneu',  suave(fatia(p, s * 2.0,  s * 2.6)).toFixed(3));
        po(roda, '--a',     suave(fatia(p, s * 2.15, s * 2.7)).toFixed(3));
        for (var j = 0; j < 4; j++) {
          po(roda, '--r' + (j + 1),
             suave(fatia(p, s * (2.25 + j * .12), s * (2.6 + j * .12))).toFixed(3));
        }
        po(roda, '--faixa', suave(fatia(p, s * 2.5, s * 2.95)).toFixed(3));
        po(roda, '--oco',   suave(fatia(p, s * 4.1, s * 4.5)).toFixed(3));
        po(roda, '--sai',   suave(fatia(p, .90, 1)).toFixed(3));
        roda.classList.toggle('tremendo', !calmo && p > s * 3.0 && p < s * 4.05);
      }
    }

    return { trilho: trilho, pintar: pintar };
  }

  var palcos = trilhos.map(montar).filter(Boolean);
  if (!palcos.length) return;

  if (calmo) return;

  var pedido = 0;
  function medir() {
    pedido = 0;
    var alt = window.innerHeight;
    palcos.forEach(function (o) {
      var r = o.trilho.getBoundingClientRect();
      if (r.bottom < -alt || r.top > alt * 2) return;   // longe demais para importar
      var curso = r.height - alt;
      o.pintar(curso <= 0 ? 1 : Math.min(1, Math.max(0, -r.top / curso)));
    });
  }
  function agendar() { if (!pedido) pedido = requestAnimationFrame(medir); }

  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar);
  medir();
})();

/* ==========================================================================
   A barra de rolagem da casa
   Só entra onde existe ponteiro fino. Em toque a barra nativa se esconde
   sozinha e uma barra fixa na borda seria estorvo.

   Ela arrasta, aceita clique no trilho para pular, e carrega uma marca por
   seção com a marca da seção atual acesa. Numa página com dois trechos
   travados, isso é orientação, não enfeite.
   ========================================================================== */
(function () {
  'use strict';
  var barra = document.querySelector('[data-rolagem]');
  if (!barra) return;
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  var punho = barra.querySelector('.rolagem__punho');
  var doc   = document.documentElement;
  var MIN   = 44;                                  // punho nunca some de vista

  var secoes = [].slice.call(document.querySelectorAll('[data-chao]')).map(function (sec) {
    var marca = document.createElement('i');
    marca.className = 'rolagem__marca';
    barra.appendChild(marca);
    return { sec: sec, marca: marca };
  });

  var altura = 0, curso = 0, cursoPunho = 0;

  function remedir() {
    var r = barra.getBoundingClientRect();
    altura = r.height - 32;                         // as margens de 16px do trilho
    var total = doc.scrollHeight;
    var visao = window.innerHeight;
    curso = Math.max(1, total - visao);

    var alt = Math.max(MIN, Math.round(visao / total * altura));
    punho.style.height = alt + 'px';
    cursoPunho = altura - alt;

    secoes.forEach(function (o) {
      var topo = o.sec.getBoundingClientRect().top + window.scrollY;
      o.marca.style.top = (16 + Math.min(1, topo / total) * altura) + 'px';
    });
  }

  function pintar() {
    var y = window.scrollY;
    punho.style.transform = 'translateY(' + (16 + (y / curso) * cursoPunho) + 'px)';

    var meio = y + window.innerHeight * .4, atual = 0;
    secoes.forEach(function (o, i) {
      if (o.sec.getBoundingClientRect().top + y <= meio) atual = i;
    });
    secoes.forEach(function (o, i) { o.marca.classList.toggle('aqui', i === atual); });
  }

  /* Uma coordenada de tela vira uma posição de rolagem. O -22 põe o cursor no
     meio do punho em vez da ponta, que é o que a mão espera ao arrastar. */
  function levar(clientY) {
    var topo = barra.getBoundingClientRect().top;
    var f = (clientY - topo - 16 - punho.offsetHeight / 2) / Math.max(1, cursoPunho);
    window.scrollTo(0, Math.min(1, Math.max(0, f)) * curso);
  }

  barra.addEventListener('pointerdown', function (e) {
    barra.classList.add('pegando');
    barra.setPointerCapture(e.pointerId);
    levar(e.clientY);
    e.preventDefault();
  });
  barra.addEventListener('pointermove', function (e) {
    if (barra.classList.contains('pegando')) levar(e.clientY);
  });
  ['pointerup', 'pointercancel'].forEach(function (n) {
    barra.addEventListener(n, function (e) {
      barra.classList.remove('pegando');
      if (barra.hasPointerCapture(e.pointerId)) barra.releasePointerCapture(e.pointerId);
    });
  });

  var pedido = 0;
  function agendar() { if (!pedido) pedido = requestAnimationFrame(function () { pedido = 0; pintar(); }); }
  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', function () { remedir(); pintar(); });

  /* Os trilhos dos portais só ganham altura depois que o motor deles roda, e
     fonte que carrega tarde também muda a altura da página. Uma remedida no
     load resolve os dois sem observador. */
  window.addEventListener('load', function () { remedir(); pintar(); });
  remedir(); pintar();
})();
