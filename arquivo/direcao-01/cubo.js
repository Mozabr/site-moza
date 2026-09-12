/* ==========================================================================
   Moza · o cubo de roda
   Peça 3D de verdade, em WebGL. A geometria não é desenho: é uma função de
   distância. Cada pixel dispara um raio e caminha até encostar no metal, e o
   que aparece na tela é o corpo fundido, a flange usinada, os dez furos de
   prisioneiro, as nervuras e o assento do rolamento, com a luz de estúdio
   refletindo na superfície conforme a peça gira.

   Sem biblioteca. WebGL puro, um arquivo, sobe por upload como o resto.

   Cadeia: cena em HDR, extração do brilho, dois borrões separáveis, e a
   composição com ACES, vinheta, véu na borda do texto e dither. É o dither
   que impede o degradê escuro de virar anel de banda.
   ========================================================================== */
(function (global) {
  'use strict';

  var VERT =
    'attribute vec2 aPos; varying vec2 vUv;' +
    'void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }';

  /* ---- A cena ---------------------------------------------------------- */

  var CENA = [
'precision highp float;',
'varying vec2 vUv;',
'uniform vec2  uRes;',
'uniform vec2  uFoco;',      // onde o cubo fica na tela, 0 a 1
'uniform float uEscala;',    // raio da peça em pixels
'uniform float uGiro;',
'uniform float uDesvio;',    // 1 bamba, 0 no centro
'uniform float uBrilho;',    // acento ciano aceso
'uniform float uCodifica;',

'#define TAU 6.28318530718',

/* --- primitivas --- */
'float cil(vec3 p, float h, float r){',
'  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);',
'  return min(max(d.x,d.y),0.0) + length(max(d,0.0));',
'}',
'float cilCh(vec3 p, float h, float r, float c){',   // com chanfro
'  return cil(p, h-c, r-c) - c;',
'}',
'float caixa(vec3 p, vec3 b, float c){',
'  vec3 d = abs(p) - b + c;',
'  return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0)) - c;',
'}',
/* Repetição polar: resolve os dez furos numa conta só, em vez de dez */
'vec3 polar(vec3 p, float n, float off){',
'  float a = atan(p.z, p.x) + off;',
'  float s = TAU/n;',
'  a = mod(a + s*0.5, s) - s*0.5;',
'  float r = length(p.xz);',
'  return vec3(cos(a)*r, p.y, sin(a)*r);',
'}',
'float suave(float a, float b, float k){',
'  float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);',
'  return mix(b,a,h) - k*h*(1.0-h);',
'}',

/* --- a peça: x é o raio, y é o eixo --- */
'vec2 mapa(vec3 p){',
'  float mat = 0.0;',                                    // 0 fundido, 1 usinado
// corpo fundido, com barril atrás
'  float corpo  = cilCh(p - vec3(0.0,-0.02,0.0), 0.26, 0.56, 0.05);',
'  float barril = cilCh(p - vec3(0.0,-0.26,0.0), 0.20, 0.40, 0.04);',
'  float d = suave(corpo, barril, 0.09);',
// nervuras de fundição, entre os furos
'  vec3 q = polar(p, 10.0, TAU/20.0);',
'  float nerv = caixa(q - vec3(0.60,0.05,0.0), vec3(0.30,0.19,0.052), 0.03);',
'  d = suave(d, nerv, 0.05);',
// flange usinada
'  float flange = cilCh(p - vec3(0.0,0.20,0.0), 0.085, 1.0, 0.028);',
'  if (flange < d) { d = flange; mat = 1.0; }',
// aro externo lobado: rebaixo entre cada par de furos
'  vec3 lb = polar(p, 10.0, TAU/20.0);',
'  float lobo = cil(lb - vec3(1.10,0.20,0.0), 0.14, 0.20);',
'  d = max(d, -lobo);',
// furos dos prisioneiros, com rebaixo usinado
'  vec3 s = polar(p, 10.0, 0.0);',
'  float furo = cil(s - vec3(0.80,0.0,0.0), 2.0, 0.088);',
'  float rebx = cil(s - vec3(0.80,0.30,0.0), 0.10, 0.135);',
'  d = max(d, -furo);',
'  if (-rebx > d) { d = max(d, -rebx); mat = 1.0; }',
// furo central e assento do rolamento
'  float bore = cil(p, 3.0, 0.285);',
'  d = max(d, -bore);',
'  float assento = cil(p - vec3(0.0,0.30,0.0), 0.30, 0.375);',
'  float dA = max(d, -assento);',
'  if (dA > d) { d = dA; mat = 1.0; }',
// sulcos de torno na face da flange
'  return vec2(d, mat);',
'}',

'vec3 normal(vec3 p){',
'  vec2 e = vec2(0.0016, 0.0);',
'  return normalize(vec3(',
'    mapa(p+e.xyy).x - mapa(p-e.xyy).x,',
'    mapa(p+e.yxy).x - mapa(p-e.yxy).x,',
'    mapa(p+e.yyx).x - mapa(p-e.yyx).x));',
'}',

'float oclusao(vec3 p, vec3 n){',
'  float o = 0.0, s = 1.0;',
'  for (int i=0;i<5;i++){',
'    float h = 0.012 + 0.11*float(i);',
'    o += (h - mapa(p + n*h).x) * s;',
'    s *= 0.72;',
'  }',
'  return clamp(1.0 - 1.35*o, 0.0, 1.0);',
'}',

/* Estúdio: um softbox grande em cima à esquerda e um preenchimento frio.
   É o reflexo do softbox que faz o olho ler a superfície como metal. */
'vec3 ceu(vec3 d){',
'  float y = d.y*0.5 + 0.5;',
'  vec3 c = mix(vec3(0.012,0.017,0.024), vec3(0.055,0.075,0.10), y);',
'  float sb = smoothstep(0.55, 0.97, dot(d, normalize(vec3(-0.55,0.72,0.42))));',
'  c += vec3(1.0,1.04,1.12) * sb * sb * 1.45;',
'  float fill = smoothstep(0.70, 1.0, dot(d, normalize(vec3(0.75,-0.25,0.35))));',
'  c += vec3(0.30,0.38,0.50) * fill * 0.30;',
'  float rim = smoothstep(0.80, 1.0, dot(d, normalize(vec3(0.15,0.35,-0.92))));',
'  c += vec3(0.16,0.30,0.46) * rim * 0.55;',
'  return c;',
'}',

'float ggx(vec3 n, vec3 v, vec3 l, float rug){',
'  vec3 h = normalize(v+l);',
'  float a = rug*rug;',
'  float nh = max(dot(n,h),0.0), nv = max(dot(n,v),1e-4), nl = max(dot(n,l),0.0);',
'  float dd = nh*nh*(a*a-1.0)+1.0;',
'  float D = a*a/(3.14159*dd*dd);',
'  float k = a*0.5;',
'  float G = (nl/(nl*(1.0-k)+k)) * (nv/(nv*(1.0-k)+k));',
'  return min(D*G/(4.0*nv*nl+1e-4)*nl, 6.0);',
'}',

'void main(){',
'  vec2 px = gl_FragCoord.xy - uFoco*uRes;',
'  vec2 uv = px / uEscala;',

// Câmera de produto: teleobjetiva curta, pouca distorção
'  vec3 alvo = vec3(0.0);',
'  vec3 co = vec3(0.92, 2.62, 1.42);',
'  vec3 f = normalize(alvo - co);',
'  vec3 r = normalize(cross(f, vec3(0.0,1.0,0.0)));',
'  vec3 u = cross(r, f);',
'  vec3 rd = normalize(f*2.15 + r*uv.x + u*uv.y);',

// O eixo do cubo desalinha e precessa quando a roda está bamba
'  float w = uDesvio * 0.075;',
'  float pr = uGiro * 0.5;',
'  float cw = cos(sin(pr)*w), sw = sin(sin(pr)*w);',
'  float cz = cos(cos(pr)*w), sz = sin(cos(pr)*w);',
'  float cg = cos(-uGiro), sg = sin(-uGiro);',

'  vec3 ro = co;',
'  float t = 0.0;',
'  float mat = 0.0;',
'  bool bateu = false;',
'  vec3 pl = vec3(0.0);',

'  for (int i=0;i<96;i++){',
'    vec3 p = ro + rd*t;',
// mundo para local: desfaz a inclinação, depois o giro próprio
'    vec3 q = vec3(p.x*cw + p.y*sw, -p.x*sw + p.y*cw, p.z);',
'    q = vec3(q.x*cz - q.z*sz, q.y, q.x*sz + q.z*cz);',
'    q = vec3(q.x*cg - q.z*sg, q.y, q.x*sg + q.z*cg);',
'    vec2 m = mapa(q);',
'    if (m.x < 0.0007*t + 0.0005){ bateu = true; mat = m.y; pl = q; break; }',
'    t += m.x*0.82;',
'    if (t > 7.5) break;',
'  }',

'  vec3 col = vec3(0.0);',
'  if (bateu){',
'    vec3 n = normal(pl);',
'    vec3 v = normalize(vec3(',
'       (co.x*cw + co.y*sw) , (-co.x*sw + co.y*cw), co.z) - pl);',
'    v = normalize(vec3(v.x*cz - v.z*sz, v.y, v.x*sz + v.z*cz));',
'    v = normalize(vec3(v.x*cg - v.z*sg, v.y, v.x*sg + v.z*cg));',

// Aço: o usinado é liso e reflete, o fundido é fosco e come a luz
'    float rug = mix(0.62, 0.19, mat);',
'    vec3 alb  = mix(vec3(0.022,0.025,0.029), vec3(0.058,0.064,0.072), mat);',
// sulcos de torno na face usinada
'    float rr = length(pl.xz);',
'    float torno = sin(rr*210.0)*0.5+0.5;',
'    rug += mat * torno * 0.09;',

'    float ao = oclusao(pl, n);',
'    vec3 refl = reflect(-v, n);',
'    vec3 amb = ceu(refl) * (1.0 - rug*0.62);',
'    float fres = pow(1.0 - max(dot(n,v),0.0), 5.0);',
'    vec3 F0 = mix(vec3(0.42,0.44,0.47), vec3(0.56,0.58,0.61), mat);',
'    vec3 F = F0 + (1.0-F0)*fres;',

'    vec3 lz = normalize(vec3(-0.55,0.72,0.42));',
'    float esp = ggx(n, v, lz, max(rug,0.06));',
'    float dif = max(dot(n,lz),0.0);',

'    col  = alb * (ceu(n)*0.70 + dif*0.22) * ao;',
'    col += amb * F * ao * 0.82;',
'    col += vec3(1.0,1.0,1.02) * esp * 1.6 * (0.30+0.70*ao);',

// O acento: um fio de luz ciano na aresta do assento, o ponto da wordmark
'    float aresta = smoothstep(0.016, 0.002, abs(rr-0.378)) * smoothstep(0.16, 0.21, pl.y);',
'    aresta += smoothstep(0.012, 0.002, abs(rr-0.285)) * smoothstep(0.02, 0.10, pl.y);',
'    col += vec3(0.0,0.70,1.0) * aresta * uBrilho * 1.25;',
'  } else {',
'    col = vec3(0.0);',
'  }',

'  if (uCodifica > 0.5) col = col/(1.0+col);',
'  gl_FragColor = vec4(col, 1.0);',
'}'
  ].join('\n');

  /* ---- Passes de pós ---------------------------------------------------- */

  var BRILHO = [
'precision mediump float; varying vec2 vUv;',
'uniform sampler2D uTex; uniform vec2 uTexel;',
'uniform float uDecodifica, uPack, uLimiar;',
'void main(){',
'  vec3 s = texture2D(uTex, vUv+uTexel*vec2(-1.0,-1.0)).rgb',
'         + texture2D(uTex, vUv+uTexel*vec2( 1.0,-1.0)).rgb',
'         + texture2D(uTex, vUv+uTexel*vec2(-1.0, 1.0)).rgb',
'         + texture2D(uTex, vUv+uTexel*vec2( 1.0, 1.0)).rgb;',
'  s *= 0.25;',
'  if (uDecodifica > 0.5) s = s/max(vec3(0.002), 1.0-s);',
'  float l = max(s.r, max(s.g, s.b));',
'  s *= max(0.0, l-uLimiar)/max(0.0001, l);',
'  gl_FragColor = vec4(s*uPack, 1.0);',
'}'].join('\n');

  var BORRAO = [
'precision mediump float; varying vec2 vUv;',
'uniform sampler2D uTex; uniform vec2 uPasso;',
'void main(){',
'  vec3 s = texture2D(uTex, vUv).rgb * 0.2270270;',
'  s += (texture2D(uTex, vUv+uPasso*1.3846154).rgb + texture2D(uTex, vUv-uPasso*1.3846154).rgb)*0.3162162;',
'  s += (texture2D(uTex, vUv+uPasso*3.2307692).rgb + texture2D(uTex, vUv-uPasso*3.2307692).rgb)*0.0702702;',
'  gl_FragColor = vec4(s,1.0);',
'}'].join('\n');

  var FINAL = [
'precision mediump float; varying vec2 vUv;',
'uniform sampler2D uCena, uBloom;',
'uniform float uDecodifica, uPack, uGlow, uExposicao, uVinheta;',
'uniform float uVeu, uVeuDir, uSemente, uAtenua;',
'vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }',
'void main(){',
'  vec3 c = texture2D(uCena, vUv).rgb;',
'  if (uDecodifica > 0.5) c = c/max(vec3(0.002), 1.0-c);',
'  c += texture2D(uBloom, vUv).rgb/uPack * uGlow;',
'  c *= uAtenua;',
'  c = aces(c*uExposicao);',
'  c = pow(max(c,0.0), vec3(0.4545));',
'  vec2 d = vUv-0.5;',
'  c *= 1.0 - uVinheta*dot(d,d)*1.9;',
// Véu na borda esquerda: é onde o texto mora. Pesado na borda, some rápido,
// para o meio do quadro não virar cinza.
'  float bordo = uVeuDir < 1.5 ? vUv.x : 1.0 - vUv.y;',
'  c *= 1.0 - uVeu*pow(1.0-clamp(bordo,0.0,1.0), 2.4);',
// Um grão de dither. Sem ele esta rampa escura vira anel de banda.
'  float n = fract(sin(dot(gl_FragCoord.xy+uSemente, vec2(12.9898,78.233)))*43758.5453);',
'  c += (n-0.5)/255.0;',
'  gl_FragColor = vec4(c,1.0);',
'}'].join('\n');

  /* ---- Motor ------------------------------------------------------------ */

  function CuboMoza(canvas, opcoes) {
    opcoes = opcoes || {};
    this.cv = canvas;
    this.giro = 0; this.giroMostrado = 0;
    this.desvio = 1; this.alvo = 1;
    this.brilho = 1; this.brilhoAlvo = 1;
    this.forca = opcoes.forca == null ? 0.0021 : opcoes.forca;
    this.calmo = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.calmo) this.forca *= 0.4;

    var att = { alpha: false, antialias: false, depth: false, stencil: false,
                powerPreference: 'high-performance', preserveDrawingBuffer: false };
    var gl = canvas.getContext('webgl2', att) || canvas.getContext('webgl', att)
             || canvas.getContext('experimental-webgl', att);
    if (!gl) { this.desistir('sem-webgl'); return; }
    this.gl = gl;
    this.gl2 = (typeof WebGL2RenderingContext !== 'undefined') && (gl instanceof WebGL2RenderingContext);

    // Renderizador por software roda isto a segundos por quadro. Vale detectar.
    var dbg = gl.getExtension('WEBGL_debug_renderer_info');
    var nome = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    this.software = /swiftshader|llvmpipe|softpipe|software|microsoft basic/i.test(nome);

    if (!this.montar()) { this.desistir('shader'); return; }
    this.medir();
    this.ligar();
    this.animar();
  }

  CuboMoza.prototype.desistir = function (por) {
    this.morto = true;
    this.cv.style.display = 'none';
    this.cv.setAttribute('data-webgl', por);
  };

  CuboMoza.prototype.compilar = function (tipo, src) {
    var gl = this.gl, s = gl.createShader(tipo);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('cubo: shader falhou,', gl.getShaderInfoLog(s) || 'sem log');
      gl.deleteShader(s); return null;
    }
    return s;
  };

  CuboMoza.prototype.ligarPrograma = function (frag) {
    var gl = this.gl;
    var vs = this.compilar(gl.VERTEX_SHADER, VERT);
    var fs = this.compilar(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return null;
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('cubo: link falhou,', gl.getProgramInfoLog(p)); return null;
    }
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var info = gl.getActiveUniform(p, i);
      if (info) u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { p: p, u: u };
  };

  CuboMoza.prototype.montar = function () {
    var gl = this.gl;
    this.pCena = this.ligarPrograma(CENA);
    this.pBrilho = this.ligarPrograma(BRILHO);
    this.pBorrao = this.ligarPrograma(BORRAO);
    this.pFinal = this.ligarPrograma(FINAL);
    if (!this.pCena || !this.pBrilho || !this.pBorrao || !this.pFinal) return false;

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);

    // Meio float mantém o brilho alto o bastante para o bloom valer. Sem ele,
    // a cena é empacotada com Reinhard em 8 bits e desempacotada na saída.
    this.hdr = true;
    this.tipo = gl.UNSIGNED_BYTE; this.interno = gl.RGBA;
    if (this.gl2) {
      if (gl.getExtension('EXT_color_buffer_half_float') || gl.getExtension('EXT_color_buffer_float')) {
        this.tipo = gl.HALF_FLOAT; this.interno = gl.RGBA16F;
      } else this.hdr = false;
    } else {
      var hf = gl.getExtension('OES_texture_half_float');
      if (hf && gl.getExtension('EXT_color_buffer_half_float')) this.tipo = hf.HALF_FLOAT_OES;
      else this.hdr = false;
    }
    if (!this.hdr) { this.tipo = gl.UNSIGNED_BYTE; this.interno = gl.RGBA; }
    this.pack = this.hdr ? 1 : 0.12;
    this.filtro = (this.gl2 || gl.getExtension('OES_texture_half_float_linear') || !this.hdr)
                  ? gl.LINEAR : gl.NEAREST;
    return true;
  };

  CuboMoza.prototype.alvoNovo = function (w, h) {
    var gl = this.gl;
    var tex = gl.createTexture(), fb = gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.interno, w, h, 0, gl.RGBA, this.tipo, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.filtro);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.filtro);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) { gl.deleteTexture(tex); gl.deleteFramebuffer(fb); return null; }
    return { fb: fb, tex: tex, w: w, h: h };
  };

  CuboMoza.prototype.soltarAlvos = function () {
    var gl = this.gl, lista = [this.tCena, this.tBloomA, this.tBloomB], i;
    for (i = 0; i < lista.length; i++) {
      if (!lista[i]) continue;
      gl.deleteTexture(lista[i].tex); gl.deleteFramebuffer(lista[i].fb);
    }
    this.tCena = this.tBloomA = this.tBloomB = null;
  };

  CuboMoza.prototype.medir = function () {
    var gl = this.gl;
    var l = global.innerWidth, a = global.innerHeight;
    var dpr = this.software ? 1 : Math.min(global.devicePixelRatio || 1, 1.75);
    var escalaR = this.software ? 0.4 : (l < 760 ? 0.75 : 0.9);
    this.cv.width = Math.round(l * dpr); this.cv.height = Math.round(a * dpr);
    this.cv.style.width = l + 'px'; this.cv.style.height = a + 'px';
    this.lw = this.cv.width; this.lh = this.cv.height;
    var sw = Math.max(2, Math.round(this.lw * escalaR)), sh = Math.max(2, Math.round(this.lh * escalaR));
    this.soltarAlvos();
    this.tCena = this.alvoNovo(sw, sh);
    this.tBloomA = this.alvoNovo(Math.max(2, sw >> 2), Math.max(2, sh >> 2));
    this.tBloomB = this.alvoNovo(Math.max(2, sw >> 2), Math.max(2, sh >> 2));
    var largo = l >= 980;
    this.foco = largo ? [0.70, 0.5] : [0.5, 0.84];
    this.escala = Math.min(l, a) * (largo ? 0.34 : 0.26) * escalaR * dpr;
    this.veu = largo ? 0.62 : 0.72;
    this.veuDir = largo ? 1 : 2;          // 1 esquerda, 2 topo
    this.limite = largo ? 1 : 0.8;
    this.precisa = true;
  };

  CuboMoza.prototype.ligar = function () {
    var eu = this, t = null;
    global.addEventListener('resize', function () {
      clearTimeout(t); t = setTimeout(function () { eu.medir(); }, 140);
    });
    global.addEventListener('scroll', function () {
      eu.giro = global.scrollY * eu.forca;
    }, { passive: true });
    this.giro = this.giroMostrado = global.scrollY * this.forca;

    this.cv.addEventListener('webglcontextlost', function (e) {
      e.preventDefault(); eu.parado = true; eu.cv.style.display = 'none';
    });
    this.cv.addEventListener('webglcontextrestored', function () {
      if (eu.montar()) { eu.cv.style.display = ''; eu.medir(); eu.parado = false; }
    });
    var vis = new IntersectionObserver(function (e) { eu.naTela = e[0].isIntersecting; }, { threshold: 0 });
    vis.observe(this.cv);
    this.naTela = true;
  };

  CuboMoza.prototype.acender = function (v) { this.brilhoAlvo = Math.max(0, Math.min(1, v)); };
  CuboMoza.prototype.paraDesvio = function (v) { this.alvo = Math.max(0, Math.min(1, v)); };
  CuboMoza.prototype.leitura = function () { return this.desvio * 2.40; };

  CuboMoza.prototype.passe = function (prog, alvo) {
    var gl = this.gl;
    gl.useProgram(prog.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, alvo ? alvo.fb : null);
    gl.viewport(0, 0, alvo ? alvo.w : this.lw, alvo ? alvo.h : this.lh);
  };
  CuboMoza.prototype.tri = function () { this.gl.drawArrays(this.gl.TRIANGLES, 0, 3); };
  CuboMoza.prototype.usarTex = function (tex, un) {
    var gl = this.gl; gl.activeTexture(gl.TEXTURE0 + un); gl.bindTexture(gl.TEXTURE_2D, tex);
  };

  CuboMoza.prototype.desenhar = function () {
    if (this.morto || this.parado || !this.tCena) return;
    var gl = this.gl, b = this.brilho * this.limite, u;

    /* cena */
    this.passe(this.pCena, this.tCena); u = this.pCena.u;
    gl.uniform2f(u.uRes, this.tCena.w, this.tCena.h);
    gl.uniform2f(u.uFoco, this.foco[0], 1 - this.foco[1]);
    gl.uniform1f(u.uEscala, this.escala);
    gl.uniform1f(u.uGiro, this.giroMostrado);
    gl.uniform1f(u.uDesvio, this.desvio);
    gl.uniform1f(u.uBrilho, b);
    gl.uniform1f(u.uCodifica, this.hdr ? 0 : 1);
    this.tri();

    /* brilho */
    this.passe(this.pBrilho, this.tBloomA); u = this.pBrilho.u;
    this.usarTex(this.tCena.tex, 0);
    gl.uniform1i(u.uTex, 0);
    gl.uniform2f(u.uTexel, 1 / this.tCena.w, 1 / this.tCena.h);
    gl.uniform1f(u.uDecodifica, this.hdr ? 0 : 1);
    gl.uniform1f(u.uPack, this.pack);
    gl.uniform1f(u.uLimiar, 0.72);
    this.tri();

    /* borrão separável, duas rodadas */
    var eu = this;
    function borrar(src, dst, dx, dy) {
      eu.passe(eu.pBorrao, dst);
      eu.usarTex(src.tex, 0);
      gl.uniform1i(eu.pBorrao.u.uTex, 0);
      gl.uniform2f(eu.pBorrao.u.uPasso, dx / dst.w, dy / dst.h);
      eu.tri();
    }
    borrar(this.tBloomA, this.tBloomB, 1, 0);
    borrar(this.tBloomB, this.tBloomA, 0, 1);
    borrar(this.tBloomA, this.tBloomB, 2.6, 0);
    borrar(this.tBloomB, this.tBloomA, 0, 2.6);

    /* composição */
    this.passe(this.pFinal, null); u = this.pFinal.u;
    this.usarTex(this.tCena.tex, 0);
    this.usarTex(this.tBloomA.tex, 1);
    gl.uniform1i(u.uCena, 0); gl.uniform1i(u.uBloom, 1);
    gl.uniform1f(u.uDecodifica, this.hdr ? 0 : 1);
    gl.uniform1f(u.uPack, this.pack);
    gl.uniform1f(u.uGlow, 0.20);
    gl.uniform1f(u.uExposicao, 0.80);
    gl.uniform1f(u.uVinheta, 0.30);
    gl.uniform1f(u.uVeu, this.veu);
    gl.uniform1f(u.uVeuDir, this.veuDir);
    gl.uniform1f(u.uAtenua, 0.28 + 0.72 * this.brilho);
    gl.uniform1f(u.uSemente, (Date.now() * 0.06) % 1000);
    this.tri();
  };

  CuboMoza.prototype.animar = function () {
    var eu = this;
    function quadro() {
      requestAnimationFrame(quadro);
      if (eu.morto || eu.parado || eu.naTela === false) return;
      var mudou = eu.precisa; eu.precisa = false;
      if (Math.abs(eu.giro - eu.giroMostrado) > 0.0005) {
        eu.giroMostrado += (eu.giro - eu.giroMostrado) * 0.12; mudou = true;
      }
      if (Math.abs(eu.alvo - eu.desvio) > 0.0015) {
        eu.desvio += (eu.alvo - eu.desvio) * 0.10; mudou = true;
      }
      if (Math.abs(eu.brilhoAlvo - eu.brilho) > 0.004) {
        eu.brilho += (eu.brilhoAlvo - eu.brilho) * 0.13; mudou = true;
      }
      if (mudou) eu.desenhar();
    }
    requestAnimationFrame(quadro);
  };

  global.CuboMoza = CuboMoza;
})(window);
