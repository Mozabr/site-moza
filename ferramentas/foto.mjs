/* Captura de tela do site da Moza, com rolagem até um seletor.
   Uso: node ferramentas/foto.mjs <arquivo> <largura> [seletor] [saida.png]
   Ex:  node ferramentas/foto.mjs kit-de-secoes.html 1440 "#assinatura"
*/
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const [ARQ = 'public/index.html', LARG = '1440', SELETOR = '', SAIDA = 'foto.png'] = process.argv.slice(2);
const RAIZ = resolve(import.meta.dirname, '..');
const PORTA = 8974;
const TIPOS = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml',
  '.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon' };

const srv = createServer(async (q, r) => {
  try {
    const c = join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
    const d = await readFile(c);
    r.writeHead(200, { 'Content-Type': TIPOS[extname(c)] || 'application/octet-stream' });
    r.end(d);
  } catch { r.writeHead(404).end('nao encontrado'); }
});
await new Promise(k => srv.listen(PORTA, '127.0.0.1', k));

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new','--remote-debugging-port=9225',
   `--user-data-dir=/tmp/moza-foto-${Date.now()}`,'--no-first-run','--hide-scrollbars',
   ...(process.env.MOZA_GL ? ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] : ['--disable-gpu']),
   'about:blank'],
  { stdio: 'ignore' });

let alvo;
for (let i = 0; i < 60; i++) {
  try {
    const abas = await (await fetch('http://127.0.0.1:9225/json/list')).json();
    const p = abas.find(a => a.type === 'page');
    if (p) { alvo = p.webSocketDebuggerUrl; break; }
  } catch {}
  await new Promise(k => setTimeout(k, 250));
}
const ws = new WebSocket(alvo);
await new Promise(k => ws.addEventListener('open', k));
let id = 0; const fila = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && fila.has(m.id)) { fila.get(m.id)(m.result); fila.delete(m.id); }
});
const cdp = (metodo, params = {}) => new Promise(k => {
  const n = ++id; fila.set(n, k); ws.send(JSON.stringify({ id: n, method: metodo, params }));
});

const larg = parseInt(LARG, 10);
await cdp('Emulation.setDeviceMetricsOverride',
  { width: larg, height: Math.round(larg * (larg < 700 ? 2.05 : 0.62)), deviceScaleFactor: 2, mobile: larg < 700 });
// Caminho que já começa com http vai direto: serve para conferir o que está no ar.
await cdp('Page.navigate', { url: /^https?:/.test(ARQ) ? ARQ : `http://127.0.0.1:${PORTA}/${ARQ}` });
// Esperar o documento inteiro, não um tempo fixo: imagem que carrega depois
// faz a página crescer e joga fora qualquer rolagem já feita.
for (let i = 0; i < 60; i++) {
  const r = await cdp('Runtime.evaluate', { returnByValue: true,
    expression: "document.readyState === 'complete'" });
  if (r.result.value) break;
  await new Promise(k => setTimeout(k, 250));
}
await new Promise(k => setTimeout(k, 700));

if (SELETOR) {
  // Número puro rola até aquela altura; o resto é seletor.
  const expr = /^\d+$/.test(SELETOR)
    ? `window.scrollTo({top:${SELETOR},behavior:'instant'})`
    : `document.querySelector(${JSON.stringify(SELETOR)})?.scrollIntoView({block:'start',behavior:'instant'})`;
  await cdp('Runtime.evaluate', { expression: expr });
  await new Promise(k => setTimeout(k, process.env.MOZA_GL ? 3000 : 1500));
}

const r = await cdp('Page.captureScreenshot', { format: 'png' });
await writeFile(SAIDA, Buffer.from(r.data, 'base64'));
console.log(`  ${SAIDA}  ${larg}px${SELETOR ? '  em ' + SELETOR : ''}`);
ws.close(); chrome.kill(); srv.close(); process.exit(0);
