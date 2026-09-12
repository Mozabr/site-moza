/* ==========================================================================
   Moza · a luz
   O hero abre quase apagado. A palavra está lá e não se vê. O único ponto
   aceso é o centro, dentro do "o", que é o que a marca quer dizer.

   O cursor carrega luz: onde ele passa, a letra aparece. Ao rolar, a luz
   cresce a partir do centro até a palavra inteira existir.

   Sem cursor (celular, teclado, leitor), a luz cresce só pela rolagem.
   ========================================================================== */
(function (global) {
  'use strict';

  function Luz(el) {
    this.el = el;
    this.marca = el.querySelector('[data-marca]');
    if (!this.marca) return;

    this.calmo = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.fino = !global.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // Onde fica o centro do "o" dentro do quadro da marca, em porcentagem.
    // É daqui que a luz nasce quando não há cursor.
    this.centro = { x: 39.9, y: 48.9 };

    this.x = this.centro.x; this.y = this.centro.y;
    this.mx = this.x; this.my = this.y;
    this.raioAlvo = this.base();
    this.raio = this.raioAlvo;

    this.ligar();
    this.animar();
  }

  /* Raio de revelação partindo só da rolagem, de 0 a 1 dentro do hero. */
  Luz.prototype.base = function () {
    var r = this.el.getBoundingClientRect();
    var passou = Math.min(1, Math.max(0, -r.top / Math.max(r.height * 0.85, 1)));
    var minimo = this.fino || this.calmo ? 26 : 19;
    return minimo + passou * 85;          // em % da largura da marca
  };

  Luz.prototype.ligar = function () {
    var eu = this;

    if (!this.fino && !this.calmo) {
      this.el.addEventListener('pointermove', function (ev) {
        var r = eu.marca.getBoundingClientRect();
        eu.x = ((ev.clientX - r.left) / r.width) * 100;
        eu.y = ((ev.clientY - r.top) / r.height) * 100;
        eu.perto = true;
      }, { passive: true });

      this.el.addEventListener('pointerleave', function () { eu.perto = false; });
    }

    global.addEventListener('scroll', function () { eu.raioAlvo = eu.base(); }, { passive: true });
    global.addEventListener('resize', function () { eu.raioAlvo = eu.base(); });
  };

  Luz.prototype.animar = function () {
    var eu = this;
    function quadro() {
      requestAnimationFrame(quadro);

      // Sem cursor em cima, a luz volta devagar para o centro
      var ax = eu.perto ? eu.x : eu.centro.x;
      var ay = eu.perto ? eu.y : eu.centro.y;
      eu.mx += (ax - eu.mx) * 0.09;
      eu.my += (ay - eu.my) * 0.09;
      eu.raio += (eu.raioAlvo - eu.raio) * 0.08;

      // O raio vai em pixel: radial-gradient com "circle" não aceita
      // porcentagem, e um valor inválido derruba a máscara inteira.
      var larg = eu.marca.offsetWidth || 800;
      var s = eu.marca.style;
      s.setProperty('--mx', eu.mx.toFixed(2) + '%');
      s.setProperty('--my', eu.my.toFixed(2) + '%');
      s.setProperty('--raio', Math.round(eu.raio / 100 * larg) + 'px');
    }
    requestAnimationFrame(quadro);
  };

  global.LuzMoza = Luz;
})(window);
