/* ==========================================================================
   Moza · o traço
   O desvio do aro medido ao longo de uma volta é uma forma de onda. Desenrolar
   o círculo vira um traço de telemetria: a roda e o traço são o mesmo dado em
   duas leituras, a circular e a temporal.

   O traço corre da direita para a esquerda, como leitura ao vivo. Quando o
   método centra a roda, ele achata até virar reta.
   ========================================================================== */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;

  /* A mesma função de empeno do cubo. Duas telas, um dado só. */
  function empeno(ang, desvio) {
    return desvio * (0.026 * Math.sin(2 * ang + 0.7) +
                     0.014 * Math.sin(3 * ang + 2.1) +
                     0.008 * Math.sin(5 * ang + 4.4));
  }

  var FUNDO_ESCALA = 2.40;   // o que o mostrador lê no empeno máximo
  var AMPLITUDE = 0.048;     // soma das harmônicas

  function TracoMoza(hospedeiro, opcoes) {
    opcoes = opcoes || {};
    this.el = hospedeiro;
    this.cv = document.createElement('canvas');
    this.cv.className = 'traco__tela';
    this.cv.setAttribute('aria-hidden', 'true');
    this.el.insertBefore(this.cv, this.el.firstChild);
    this.ctx = this.cv.getContext('2d');

    this.fase = 0;
    this.desvio = 1;
    this.alvo = 1;
    this.velocidade = opcoes.velocidade == null ? 0.0075 : opcoes.velocidade;
    this.calmo = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.calmo) this.velocidade *= 0.35;

    this.valor = this.el.querySelector('[data-traco-valor]');
    this.veredito = this.el.querySelector('[data-traco-veredito]');
    this.ultimo = -1;

    this.medir();
    var eu = this, t = null;
    global.addEventListener('resize', function () {
      clearTimeout(t); t = setTimeout(function () { eu.medir(); }, 140);
    });
    var olho = new IntersectionObserver(function (e) { eu.naTela = e[0].isIntersecting; }, { threshold: 0 });
    olho.observe(this.el);
    this.naTela = true;
    this.animar();
  }

  TracoMoza.prototype.medir = function () {
    var r = this.el.getBoundingClientRect();
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.l = Math.max(1, Math.round(r.width));
    this.a = Math.max(1, Math.round(r.height));
    this.cv.width = Math.round(this.l * dpr);
    this.cv.height = Math.round(this.a * dpr);
    this.cv.style.width = this.l + 'px';
    this.cv.style.height = this.a + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.precisa = true;
  };

  TracoMoza.prototype.paraDesvio = function (v) { this.alvo = Math.max(0, Math.min(1, v)); };

  TracoMoza.prototype.pico = function () {
    var p = 0, a;
    for (a = 0; a < TAU; a += Math.PI / 90) p = Math.max(p, Math.abs(empeno(a, this.desvio)));
    return p / AMPLITUDE * FUNDO_ESCALA;
  };

  TracoMoza.prototype.desenhar = function () {
    var c = this.ctx, L = this.l, A = this.a;
    var meio = A * 0.52;
    var escala = A * 0.34 / AMPLITUDE;      // pixels por unidade de empeno
    var passo = 2;                           // amostragem em pixels
    var porPixel = TAU / (L * 0.42);         // quantas voltas cabem na largura

    c.clearRect(0, 0, L, A);

    /* Grade: fina, discreta, de instrumento */
    c.strokeStyle = 'rgba(150,172,190,.07)';
    c.lineWidth = 1;
    var i, x;
    for (i = 0; i <= 10; i++) {
      x = Math.round((L / 10) * i) + .5;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, A); c.stroke();
    }
    var linhas = [-1, -0.5, 0.5, 1];
    for (i = 0; i < linhas.length; i++) {
      var y = Math.round(meio - linhas[i] * AMPLITUDE * escala) + .5;
      c.beginPath(); c.moveTo(0, y); c.lineTo(L, y); c.stroke();
    }

    /* O nominal: a linha do zero, que é onde a roda deveria estar */
    c.strokeStyle = 'rgba(150,172,190,.26)';
    c.setLineDash([2, 5]);
    c.beginPath(); c.moveTo(0, Math.round(meio) + .5); c.lineTo(L, Math.round(meio) + .5); c.stroke();
    c.setLineDash([]);

    /* A faixa do empeno: onde o aro passeia. Some quando a roda centra. */
    var p = 0, a;
    for (a = 0; a < TAU; a += Math.PI / 60) p = Math.max(p, Math.abs(empeno(a, this.desvio)));
    if (p > 0.0004) {
      c.fillStyle = 'rgba(0,180,255,.05)';
      c.fillRect(0, meio - p * escala, L, p * escala * 2);
      c.strokeStyle = 'rgba(0,180,255,.16)';
      c.beginPath();
      c.moveTo(0, Math.round(meio - p * escala) + .5); c.lineTo(L, Math.round(meio - p * escala) + .5);
      c.moveTo(0, Math.round(meio + p * escala) + .5); c.lineTo(L, Math.round(meio + p * escala) + .5);
      c.stroke();
    }

    /* O traço. Envelhece para a esquerda: o dado novo entra pela direita. */
    var pontos = [];
    for (x = 0; x <= L; x += passo) {
      var ang = this.fase - (L - x) * porPixel / 6;
      pontos.push([x, meio - empeno(ang, this.desvio) * escala]);
    }

    // Rastro apagado, o que já passou
    c.beginPath();
    for (i = 0; i < pontos.length; i++) c[i ? 'lineTo' : 'moveTo'](pontos[i][0], pontos[i][1]);
    c.strokeStyle = 'rgba(130,162,188,.38)';
    c.lineWidth = 1.2; c.lineJoin = 'round'; c.stroke();

    // Trecho vivo, os últimos 34% da largura
    var corte = Math.floor(pontos.length * 0.42);
    c.beginPath();
    for (i = corte; i < pontos.length; i++) c[i === corte ? 'moveTo' : 'lineTo'](pontos[i][0], pontos[i][1]);
    c.strokeStyle = '#00B4FF';
    c.lineWidth = 2.2;
    c.shadowColor = 'rgba(0,180,255,.85)'; c.shadowBlur = 14;
    c.stroke();
    c.shadowBlur = 0;

    /* A cabeça de leitura, na borda direita */
    var ultimo = pontos[pontos.length - 1];
    c.strokeStyle = 'rgba(0,180,255,.28)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(ultimo[0] + .5, 0); c.lineTo(ultimo[0] + .5, A); c.stroke();
    c.beginPath(); c.arc(ultimo[0], ultimo[1], 3.2, 0, TAU);
    c.fillStyle = '#00B4FF'; c.fill();
    c.beginPath(); c.arc(ultimo[0], ultimo[1], 7, 0, TAU);
    c.strokeStyle = 'rgba(0,180,255,.34)'; c.stroke();

    /* Leitura */
    var pk = this.pico();
    var agora = Math.round(pk * 100);
    if (agora !== this.ultimo) {
      this.ultimo = agora;
      if (this.valor) this.valor.textContent = pk.toFixed(2).replace('.', ',');
      if (this.veredito) {
        var v = this.desvio <= 0.06 ? 'no centro'
              : this.desvio <= 0.30 ? 'quase no eixo'
              : this.desvio <= 0.55 ? 'girando torto'
              : this.desvio <= 0.80 ? 'desalinhada' : 'bamba';
        if (this.veredito.textContent !== v) this.veredito.textContent = v;
        this.el.classList.toggle('traco--centrado', this.desvio <= 0.06);
      }
    }
  };

  TracoMoza.prototype.animar = function () {
    var eu = this;
    function quadro() {
      requestAnimationFrame(quadro);
      if (eu.naTela === false) return;
      var mudou = eu.precisa; eu.precisa = false;
      eu.fase += eu.velocidade; mudou = true;
      if (Math.abs(eu.alvo - eu.desvio) > 0.0015) {
        eu.desvio += (eu.alvo - eu.desvio) * 0.10;
      }
      if (mudou) eu.desenhar();
    }
    requestAnimationFrame(quadro);
  };

  global.TracoMoza = TracoMoza;
})(window);
