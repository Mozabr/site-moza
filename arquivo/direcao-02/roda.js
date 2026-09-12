/* ==========================================================================
   Moza · aparelho de centragem
   A roda da marca, desenhada em compasso e régua: um centro, um raio,
   terminais retos. Nasce bamba e vai ao centro conforme o método avança.
   Sem dependência. Respeita prefers-reduced-motion.
   ========================================================================== */
(function (global) {
  'use strict';

  var CX = 200, CY = 220, R = 160, R_CUBO = 30;
  var GRAUS = [45, 135, 225, 315];        // os quatro raios do símbolo
  var PONTOS = 180;                        // resolução do aro
  var EMPENO = 0.048;                      // amplitude máxima somada das harmônicas
  var FUNDO_ESCALA = 2.40;                 // o que o mostrador lê no empeno máximo

  var VEREDITOS = [
    { ate: 0.06, texto: 'no centro',     ciano: true  },
    { ate: 0.30, texto: 'quase no eixo', ciano: false },
    { ate: 0.55, texto: 'girando torto', ciano: false },
    { ate: 0.80, texto: 'desalinhada',   ciano: false },
    { ate: 1.01, texto: 'bamba',         ciano: false }
  ];

  function calmo() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Raio do aro em um ângulo, dado o desvio. Três harmônicas somadas:
     é o que faz o empeno parecer real em vez de uma elipse girando. */
  function raioEm(ang, desvio) {
    return R * (1 + desvio * (
      0.026 * Math.sin(2 * ang + 0.7) +
      0.014 * Math.sin(3 * ang + 2.1) +
      0.008 * Math.sin(5 * ang + 4.4)
    ));
  }

  function caminhoDoAro(desvio) {
    var d = '', i, ang, r;
    for (i = 0; i <= PONTOS; i++) {
      ang = (i / PONTOS) * Math.PI * 2;
      r = raioEm(ang, desvio);
      d += (i ? 'L' : 'M') + (CX + r * Math.cos(ang)).toFixed(2) +
           ',' + (CY + r * Math.sin(ang)).toFixed(2);
    }
    return d + 'Z';
  }

  function no(nome, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', nome);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function RodaMoza(hospedeiro, opcoes) {
    opcoes = opcoes || {};
    this.hospedeiro = hospedeiro;
    this.desvio = opcoes.desvio == null ? 1 : opcoes.desvio;
    this.alvo = this.desvio;
    this.giro = 0;                                   // radianos
    this.velocidade = opcoes.velocidade == null ? 0.0032 : opcoes.velocidade;
    this.impulso = 0;
    this.arrastando = false;
    this.calmo = calmo();
    this.ultimoTexto = -1;
    this.montar();
    this.aplicarDesvio(this.desvio);
    if (!this.calmo) this.animar();
    else this.desenharQuadro();
  }

  RodaMoza.prototype.montar = function () {
    var svg = no('svg', {
      viewBox: '24 44 440 352',
      class: 'roda__svg',
      role: 'img',
      'aria-label': 'Aparelho de centragem da Moza: uma roda com cubo, quatro raios e um apalpador que mede o desvio do aro'
    });

    // Aro e raios giram juntos. O cubo fica parado: o centro não balança.
    var gira = no('g', { class: 'roda__gira' });
    this.aro = no('path', { class: 'roda__aro', d: caminhoDoAro(this.desvio) });
    gira.appendChild(this.aro);

    var i, ang, r;
    for (i = 0; i < GRAUS.length; i++) {
      ang = GRAUS[i] * Math.PI / 180;
      r = raioEm(ang, this.desvio);
      gira.appendChild(no('line', {
        class: 'roda__raio',
        'data-raio': i + 1,
        x1: (CX + R_CUBO * Math.cos(ang)).toFixed(2),
        y1: (CY + R_CUBO * Math.sin(ang)).toFixed(2),
        x2: (CX + r * Math.cos(ang)).toFixed(2),
        y2: (CY + r * Math.sin(ang)).toFixed(2)
      }));
    }
    this.gira = gira;
    svg.appendChild(gira);

    // O cubo é o disco ciano cheio do "o" da wordmark. A roda é a letra ampliada.
    svg.appendChild(no('circle', { class: 'roda__cubo', cx: CX, cy: CY, r: R_CUBO }));

    // O medidor: coluna de apoio, referência do nominal e escala
    var medidor = no('g', { class: 'roda__medidor' });
    medidor.appendChild(no('line', { class: 'roda__coluna', x1: 454, y1: CY - 58, x2: 454, y2: CY + 58 }));
    medidor.appendChild(no('line', { class: 'roda__nominal', x1: CX + R, y1: CY - 34, x2: CX + R, y2: CY + 34 }));
    for (i = -2; i <= 2; i++) {
      medidor.appendChild(no('line', {
        class: 'roda__marca',
        x1: CX + R + i * 8, y1: CY + 40,
        x2: CX + R + i * 8, y2: CY + (i === 0 ? 50 : 46)
      }));
    }
    svg.appendChild(medidor);

    // O braço apalpador: sai da coluna, encosta no aro e desliza com o empeno
    this.apalpador = no('line', { class: 'roda__apalpador', x1: 454, y1: CY, x2: CX + R, y2: CY });
    this.ponta = no('circle', { class: 'roda__ponta', cx: CX + R, cy: CY, r: 3.5 });
    svg.appendChild(this.apalpador);
    svg.appendChild(this.ponta);

    this.hospedeiro.insertBefore(svg, this.hospedeiro.firstChild);
    this.svg = svg;

    this.leitura = this.hospedeiro.querySelector('[data-roda-valor]');
    this.veredito = this.hospedeiro.querySelector('[data-roda-veredito]');

    if (!this.calmo) this.ligarArrasto(svg);
  };

  /* Arrastar para girar. Ponteiro unificado, funciona com dedo e mouse. */
  RodaMoza.prototype.ligarArrasto = function (svg) {
    var eu = this, anterior = 0, id = null;

    function angulo(ev) {
      var cx = svg.getBoundingClientRect();
      return Math.atan2(
        ev.clientY - (cx.top + cx.height * ((CY - 44) / 352)),
        ev.clientX - (cx.left + cx.width * ((CX - 24) / 440))
      );
    }

    svg.addEventListener('pointerdown', function (ev) {
      if (id !== null) return;
      id = ev.pointerId;
      eu.arrastando = true;
      anterior = angulo(ev);
      svg.setPointerCapture(id);
      svg.classList.add('roda__svg--pegando');
    });

    svg.addEventListener('pointermove', function (ev) {
      if (!eu.arrastando || ev.pointerId !== id) return;
      var atual = angulo(ev), delta = atual - anterior;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      eu.giro += delta;
      eu.impulso = delta * 0.55;
      anterior = atual;
    });

    function soltar(ev) {
      if (ev.pointerId !== id) return;
      eu.arrastando = false;
      id = null;
      svg.classList.remove('roda__svg--pegando');
    }
    svg.addEventListener('pointerup', soltar);
    svg.addEventListener('pointercancel', soltar);
  };

  /* Redesenha o aro e os raios. Só roda quando o desvio muda, nunca por quadro. */
  RodaMoza.prototype.aplicarDesvio = function (v) {
    this.aro.setAttribute('d', caminhoDoAro(v));
    var raios = this.gira.querySelectorAll('.roda__raio'), i, ang, r;
    for (i = 0; i < raios.length; i++) {
      ang = GRAUS[i] * Math.PI / 180;
      r = raioEm(ang, v);
      raios[i].setAttribute('x2', (CX + r * Math.cos(ang)).toFixed(2));
      raios[i].setAttribute('y2', (CY + r * Math.sin(ang)).toFixed(2));
      raios[i].classList.toggle('roda__raio--tenso', i < this.raiosTensos());
    }
    // Pico do empeno na volta inteira: é o que o mecânico lê, não o instante
    var pico = 0, a, fora;
    for (a = 0; a < Math.PI * 2; a += Math.PI / 90) {
      fora = Math.abs(raioEm(a, v) - R);
      if (fora > pico) pico = fora;
    }
    this.pico = pico / (R * EMPENO) * FUNDO_ESCALA;
  };

  RodaMoza.prototype.raiosTensos = function () {
    return Math.round((1 - this.alvo) * 4);
  };

  /* Define o desvio alvo, de 0 (no centro) a 1 (bamba). */
  RodaMoza.prototype.paraDesvio = function (v) {
    this.alvo = Math.max(0, Math.min(1, v));
    if (this.calmo) { this.desvio = this.alvo; this.aplicarDesvio(this.desvio); this.desenharQuadro(); }
  };

  RodaMoza.prototype.desenharQuadro = function () {
    // O apalpador lê o aro no ponto fixo do medidor
    var r = raioEm(-this.giro, this.desvio);
    this.apalpador.setAttribute('x2', (CX + r).toFixed(2));
    this.ponta.setAttribute('cx', (CX + r).toFixed(2));

    var agora = Math.round(this.pico * 100);
    if (agora !== this.ultimoTexto) {
      this.ultimoTexto = agora;
      if (this.leitura) this.leitura.textContent = this.pico.toFixed(2).replace('.', ',');
      if (this.veredito) {
        for (var i = 0; i < VEREDITOS.length; i++) {
          if (this.desvio <= VEREDITOS[i].ate) {
            if (this.veredito.textContent !== VEREDITOS[i].texto) {
              this.veredito.textContent = VEREDITOS[i].texto;
            }
            this.hospedeiro.classList.toggle('roda--centrada', VEREDITOS[i].ciano);
            break;
          }
        }
      }
    }
  };

  RodaMoza.prototype.animar = function () {
    var eu = this;
    function quadro() {
      if (!eu.arrastando) {
        eu.giro += eu.velocidade + eu.impulso;
        eu.impulso *= 0.955;
        if (Math.abs(eu.impulso) < 0.00004) eu.impulso = 0;
      }
      if (Math.abs(eu.alvo - eu.desvio) > 0.0015) {
        eu.desvio += (eu.alvo - eu.desvio) * 0.06;
        eu.aplicarDesvio(eu.desvio);
      }
      eu.gira.setAttribute('transform', 'rotate(' + (eu.giro * 180 / Math.PI).toFixed(2) + ' ' + CX + ' ' + CY + ')');
      eu.desenharQuadro();
      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);
  };

  global.RodaMoza = RodaMoza;
})(window);
