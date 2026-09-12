/* QA do site da Moza.
   Mede a borda direita de cada elemento contra a largura da tela, em vários
   celulares reais, e confere contraste e alvo de toque. Não confia no olho.

   Uso: node ferramentas/qa.mjs [caminho]     (padrão: public/index.html)
*/
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RAIZ = resolve(import.meta.dirname, '..');
const ALVO = process.argv[2] || 'public/index.html';
const PORTA = 8971;

const TELAS = [
  { nome: 'iPhone SE',        w: 320, h: 568, dpr: 2 },
  { nome: 'iPhone 12 mini',   w: 375, h: 812, dpr: 3 },
  { nome: 'iPhone 15',        w: 393, h: 852, dpr: 3 },
  { nome: 'iPhone 15 Pro Max',w: 430, h: 932, dpr: 3 },
  { nome: 'Galaxy S21',       w: 360, h: 800, dpr: 3 },
  { nome: 'iPad',             w: 768, h: 1024, dpr: 2 },
  { nome: 'Desktop',          w: 1440, h: 900, dpr: 2 }
];

const TIPOS = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript',
  '.svg':'image/svg+xml', '.woff2':'font/woff2', '.png':'image/png',
  '.jpg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon', '.xml':'application/xml',
  '.txt':'text/plain', '.json':'application/json', '.webmanifest':'application/manifest+json' };

const servidor = createServer(async (req, res) => {
  try {
    const caminho = join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
    const dados = await readFile(caminho);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(caminho)] || 'application/octet-stream' });
    res.end(dados);
  } catch { res.writeHead(404).end('nao encontrado'); }
});
await new Promise(ok => servidor.listen(PORTA, '127.0.0.1', ok));

const perfil = `/tmp/moza-qa-${Date.now()}`;
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9222',
  `--user-data-dir=${perfil}`, '--no-first-run', '--hide-scrollbars',
   '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', 'about:blank'],
  { stdio: 'ignore' });

async function alvoCDP() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:9222/json/list');
      const abas = await r.json();
      const aba = abas.find(a => a.type === 'page');
      if (aba) return aba.webSocketDebuggerUrl;
    } catch {}
    await new Promise(ok => setTimeout(ok, 250));
  }
  throw new Error('Chrome não subiu');
}

const ws = new WebSocket(await alvoCDP());
await new Promise(ok => ws.addEventListener('open', ok));

let id = 0; const esperando = new Map();
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m.result); esperando.delete(m.id); }
});
const cdp = (metodo, params = {}) => new Promise(ok => {
  const n = ++id; esperando.set(n, ok);
  ws.send(JSON.stringify({ id: n, method: metodo, params }));
});

const SONDA = `(() => {
  const larg = document.documentElement.clientWidth;
  const vazam = [];
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const est = getComputedStyle(el);
    if (est.position === 'fixed' || est.visibility === 'hidden' || est.display === 'none') return;
    if (r.right <= 0) return;              // escondido fora da tela de propósito, não gera rolagem
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;   // sangramento aparado por um ancestral não vaza
      if (ox === 'hidden' || ox === 'clip' || ox === 'auto' || ox === 'scroll') return;
    }
    if (r.right > larg + 0.5 || r.left < -0.5) {
      vazam.push({
        tag: el.tagName.toLowerCase(),
        classe: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 46),
        esq: Math.round(r.left), dir: Math.round(r.right)
      });
    }
  });
  const alvos = [];
  document.querySelectorAll('a[href], button, summary, [role="button"]').forEach(el => {
    // offsetWidth/Height é o tamanho de layout. getBoundingClientRect devolve o
    // retângulo já transformado, e um rotateX de animação achata a medida: daria
    // falso positivo de alvo pequeno em elemento que na verdade tem 46px.
    const l = el.offsetWidth, a = el.offsetHeight;
    if (l === 0 || a === 0) return;
    if (a < 44 || l < 44) alvos.push({
      texto: (el.textContent || '').trim().slice(0, 34), l, a
    });
  });
  return JSON.stringify({
    larg,
    rolagemH: document.documentElement.scrollWidth > larg + 0.5,
    scrollWidth: document.documentElement.scrollWidth,
    vazam: vazam.slice(0, 12), totalVazam: vazam.length,
    alvos: alvos.slice(0, 8), totalAlvos: alvos.length,
    semAlt: document.querySelectorAll('img:not([alt])').length,
    h1: document.querySelectorAll('h1').length,
    titulo: document.title
  });
})()`;

console.log(`\n  QA · ${ALVO}\n  ${'-'.repeat(64)}`);
let falhas = 0;

for (const t of TELAS) {
  await cdp('Emulation.setDeviceMetricsOverride',
    { width: t.w, height: t.h, deviceScaleFactor: t.dpr, mobile: t.w < 700 });
  await cdp('Page.navigate', { url: `http://127.0.0.1:${PORTA}/${ALVO}` });
  await new Promise(ok => setTimeout(ok, 1400));
  const r = await cdp('Runtime.evaluate', { expression: SONDA, returnByValue: true });
  const d = JSON.parse(r.result.value);

  const ok = !d.rolagemH && d.totalVazam === 0;
  if (!ok) falhas++;
  console.log(`\n  ${ok ? '[ok] ' : '[X]  '}${t.nome.padEnd(19)} ${String(t.w).padStart(4)}px   scrollWidth ${d.scrollWidth}`);
  if (d.rolagemH) console.log(`       rolagem horizontal: a página tem ${d.scrollWidth}px numa tela de ${d.larg}px`);
  for (const v of d.vazam) console.log(`       vaza: <${v.tag}${v.classe ? ' class="' + v.classe + '"' : ''}>  esq ${v.esq}  dir ${v.dir}`);
  if (d.totalVazam > d.vazam.length) console.log(`       (mais ${d.totalVazam - d.vazam.length} elementos)`);
  if (t.w < 700 && d.totalAlvos) {
    falhas++;
    console.log(`       alvo de toque abaixo de 44px em ${d.totalAlvos}:`);
    for (const a of d.alvos) console.log(`         "${a.texto}"  ${a.l}x${a.a}`);
  }
  if (d.semAlt) { falhas++; console.log(`       ${d.semAlt} imagem sem alt`); }
  if (d.h1 !== 1) { falhas++; console.log(`       ${d.h1} elementos h1 (precisa ser exatamente 1)`); }
}

console.log(`\n  ${'-'.repeat(64)}`);
console.log(falhas === 0 ? '  Passou em todas as telas.\n' : `  ${falhas} problema(s) a corrigir.\n`);

ws.close(); chrome.kill(); servidor.close();
process.exit(falhas === 0 ? 0 : 1);
