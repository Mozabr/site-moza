/* Renderiza um site de verdade no navegador e devolve a estrutura dele.
   Serve para benchmark: site feito em Framer, Webflow ou React não entrega
   conteúdo para leitor de HTML cru, só depois de rodar o JavaScript.

   Uso: node ferramentas/ler-site.mjs <url> [pasta-de-capturas]
*/
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const URL_ALVO = process.argv[2];
const PASTA = process.argv[3];
if (!URL_ALVO) { console.error('uso: node ferramentas/ler-site.mjs <url> [pasta]'); process.exit(1); }

const ch = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--remote-debugging-port=9233', `--user-data-dir=/tmp/ler${Date.now()}`,
   '--no-first-run', '--hide-scrollbars', '--use-angle=swiftshader',
   '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });

let ws_url;
for (let i = 0; i < 80; i++) {
  try {
    const a = await (await fetch('http://127.0.0.1:9233/json/list')).json();
    const p = a.find(x => x.type === 'page');
    if (p) { ws_url = p.webSocketDebuggerUrl; break; }
  } catch {}
  await new Promise(k => setTimeout(k, 250));
}
const ws = new WebSocket(ws_url);
await new Promise(k => ws.addEventListener('open', k));
let id = 0; const fila = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && fila.has(m.id)) { fila.get(m.id)(m.result); fila.delete(m.id); }
});
const cdp = (m, p = {}) => new Promise(k => { const n = ++id; fila.set(n, k); ws.send(JSON.stringify({ id: n, method: m, params: p })); });

await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: URL_ALVO });
await new Promise(k => setTimeout(k, 6000));

// Rola a página inteira, para disparar o que só carrega ao entrar na tela
const alt = JSON.parse((await cdp('Runtime.evaluate', { returnByValue: true,
  expression: 'JSON.stringify(document.body.scrollHeight)' })).result.value);
for (let y = 0; y < alt; y += 700) {
  await cdp('Runtime.evaluate', { expression: `window.scrollTo(0,${y})` });
  await new Promise(k => setTimeout(k, 260));
}
await cdp('Runtime.evaluate', { expression: 'window.scrollTo(0,0)' });
await new Promise(k => setTimeout(k, 900));

const r = await cdp('Runtime.evaluate', { returnByValue: true, expression: `(() => {
  const limpo = t => (t||'').replace(/\\s+/g,' ').trim();
  const linhas = [];
  const visto = new Set();
  document.querySelectorAll('h1,h2,h3,h4,p,li,button,a,figcaption,blockquote,span').forEach(el => {
    if (el.closest('nav,header')) return;
    const r = el.getBoundingClientRect();
    if (!el.offsetParent && el.tagName !== 'BODY') return;
    const t = limpo(el.textContent);
    if (!t || t.length < 2 || t.length > 400) return;
    if (el.querySelector('h1,h2,h3,h4,p,li,button')) return;
    const chave = el.tagName + '|' + t;
    if (visto.has(chave)) return;
    visto.add(chave);
    linhas.push({ tag: el.tagName, y: Math.round(el.getBoundingClientRect().top + scrollY), t });
  });
  linhas.sort((a,b) => a.y - b.y);
  const nav = [...document.querySelectorAll('nav a, header a')].map(a => limpo(a.textContent)).filter(Boolean);
  return JSON.stringify({
    titulo: document.title,
    altura: document.body.scrollHeight,
    nav: [...new Set(nav)],
    linhas: linhas.slice(0, 220)
  });
})()` });

const d = JSON.parse(r.result.value);
console.log(`\n  ${d.titulo}`);
console.log(`  página de ${d.altura}px`);
console.log(`  navegação: ${d.nav.join(' · ') || '(nenhuma)'}\n  ${'-'.repeat(74)}`);
let ultimo = -9999;
for (const l of d.linhas) {
  if (l.y - ultimo > 260) console.log(`\n  ── ${l.y}px ──`);
  ultimo = l.y;
  const marca = l.tag === 'H1' ? 'H1 ' : l.tag === 'H2' ? 'H2 ' : l.tag === 'H3' ? 'H3 ' :
                l.tag === 'H4' ? 'H4 ' : l.tag === 'BUTTON' || l.tag === 'A' ? '>> ' : '   ';
  console.log(`  ${marca}${l.t}`);
}
console.log();

if (PASTA) {
  await mkdir(PASTA, { recursive: true });
  for (let i = 0; i < 5; i++) {
    const y = Math.round(i * (d.altura - 900) / 4);
    await cdp('Runtime.evaluate', { expression: `window.scrollTo(0,${y})` });
    await new Promise(k => setTimeout(k, 1200));
    const s = await cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${PASTA}/tela-${i + 1}.png`, Buffer.from(s.data, 'base64'));
  }
  console.log(`  5 capturas em ${PASTA}\n`);
}
ws.close(); ch.kill(); process.exit(0);
