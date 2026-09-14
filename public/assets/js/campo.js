/* ==========================================================================
   Moza · o campo
   Fundo vivo para as faixas de azul. Ruído em camadas que deriva devagar,
   mistura dentro da família do azul, vinheta e grão de filme.

   O grão é o que separa isto de um degradê de CSS: sem ele a superfície fica
   plástica. Com ele, parece material.

   Sem WebGL, o elemento simplesmente não recebe nada e a faixa continua de pé
   com a cor chapada que já está no CSS.
   ========================================================================== */
(function (global) {
  'use strict';

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  var FRAG = [
'precision highp float;',
'uniform vec2  uRes;',
'uniform float uT;',
'uniform vec3  uA;',      // o chão da faixa
'uniform vec3  uB;',      // o azul que sobe
'uniform vec3  uC;',      // o brilho, na ponta
'uniform float uForca;',

'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'float ruido(vec2 p){',
'  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
'  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);',
'}',
/* Camadas somadas: cada oitava com metade do peso e o dobro da frequência.
   É o que dá a nuvem em vez da mancha. */
'float fbm(vec2 p){',
'  float s=0.,a=.5;',
'  for(int i=0;i<5;i++){s+=a*ruido(p);p=p*2.03+vec2(11.3,7.1);a*=.5;}',
'  return s;',
'}',

'void main(){',
'  vec2 uv=gl_FragCoord.xy/uRes;',
'  vec2 q=uv*vec2(uRes.x/uRes.y,1.);',

/* Duas nuvens em velocidades diferentes. A diferença entre elas é o que faz
   a superfície parecer que respira em vez de escorrer. */
'  float n1=fbm(q*1.7+vec2(uT*.020,uT*-.013));',
'  float n2=fbm(q*2.9+vec2(uT*-.011,uT*.017)+n1*.6);',
'  float n=mix(n1,n2,.55);',

'  vec3 c=mix(uA,uB,smoothstep(.30,.72,n));',
'  c=mix(c,uC,smoothstep(.62,.92,n2)*.55);',

/* Vinheta: puxa a borda para o chão, para a faixa não ter emenda visível */
'  float d=distance(uv,vec2(.5));',
'  c=mix(c,uA,smoothstep(.34,.78,d));',

/* Grão de filme. Sem ele a superfície fica plástica. */
'  float g=h(gl_FragCoord.xy+fract(uT)*vec2(91.7,53.3));',
'  c+=(g-.5)*.022;',

'  gl_FragColor=vec4(mix(uA,c,uForca),1.);',
'}'].join('\n');

  function hex(v) {
    v = v.replace('#', '');
    return [parseInt(v.slice(0,2),16)/255, parseInt(v.slice(2,4),16)/255, parseInt(v.slice(4,6),16)/255];
  }

  function Campo(el) {
    var cv = document.createElement('canvas');
    cv.className = 'campo__tela';
    cv.setAttribute('aria-hidden', 'true');
    el.insertBefore(cv, el.firstChild);

    var att = { alpha:false, antialias:false, depth:false, powerPreference:'low-power' };
    var gl = cv.getContext('webgl', att) || cv.getContext('experimental-webgl', att);
    if (!gl) { cv.remove(); return; }          // sem WebGL a faixa fica chapada

    function sh(t, src) {
      var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('campo:', gl.getShaderInfoLog(s)); return null;
      }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { cv.remove(); return; }
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs);
    gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr); gl.useProgram(pr);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var u = {};
    ['uRes','uT','uA','uB','uC','uForca'].forEach(function(n){ u[n]=gl.getUniformLocation(pr,n); });

    var d = el.dataset;
    gl.uniform3fv(u.uA, hex(d.campoA || '#0A2340'));
    gl.uniform3fv(u.uB, hex(d.campoB || '#124A80'));
    gl.uniform3fv(u.uC, hex(d.campoC || '#2B87C8'));
    gl.uniform1f(u.uForca, parseFloat(d.campoForca || '0.85'));

    var calmo = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var naTela = true, t0 = performance.now();

    function medir() {
      var r = el.getBoundingClientRect();
      var dpr = Math.min(global.devicePixelRatio || 1, 1.5);
      cv.width = Math.max(2, Math.round(r.width * dpr));
      cv.height = Math.max(2, Math.round(r.height * dpr));
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(u.uRes, cv.width, cv.height);
    }
    medir();
    var tmr = null;
    global.addEventListener('resize', function(){ clearTimeout(tmr); tmr=setTimeout(medir,150); });
    new IntersectionObserver(function(e){ naTela = e[0].isIntersecting; }, {threshold:0}).observe(el);

    function quadro(now) {
      requestAnimationFrame(quadro);
      if (!naTela) return;
      gl.uniform1f(u.uT, calmo ? 8 : (now - t0) * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (calmo) naTela = false;            // quem pede menos movimento vê um quadro só
    }
    requestAnimationFrame(quadro);
  }

  global.CampoMoza = Campo;
})(window);
