// Renders .dc.html mockups to PNG with a tiny stand-in for the canvas runtime.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

const SRC = process.argv[2];
const OUT = process.argv[3];
const jobs = JSON.parse(process.argv[4]);

const runtime = `
window.renderDC = (source) => {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  const code = doc.querySelector('script[data-dc-script]').textContent;
  class DCLogic { constructor(p){ this.props = p || {}; this.state = {}; } setState(s){ Object.assign(this.state, typeof s === 'function' ? s(this.state) : s); } forceUpdate(){} }
  const Component = new Function('DCLogic', code + '; return Component;')(DCLogic);
  const inst = new Component({});
  const vals = inst.renderVals();
  const xdc = doc.querySelector('x-dc');
  const helmet = xdc.querySelector('helmet');
  if (helmet) { for (const n of [...helmet.children]) document.head.appendChild(document.importNode(n, true)); helmet.remove(); }
  const look = (expr, scope) => {
    expr = expr.trim();
    if (expr === 'true') return true; if (expr === 'false') return false;
    if (/^-?\\d+(\\.\\d+)?$/.test(expr)) return Number(expr);
    return expr.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  };
  const interp = (str, scope) => str.replace(/\\{\\{([^}]+)\\}\\}/g, (_, e) => { const v = look(e, scope); return v == null ? '' : String(v); });
  const render = (node, scope, parent) => {
    if (node.nodeType === 3) { parent.appendChild(document.createTextNode(interp(node.textContent, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      const list = look(node.getAttribute('list').replace(/[{}]/g, ''), scope) || [];
      const as = node.getAttribute('as');
      list.forEach((item, i) => { for (const c of node.childNodes) render(c, { ...scope, [as]: item, $index: i }, parent); });
      return;
    }
    if (tag === 'sc-if') {
      if (look(node.getAttribute('value').replace(/[{}]/g, ''), scope)) for (const c of node.childNodes) render(c, scope, parent);
      return;
    }
    const el = node.namespaceURI === 'http://www.w3.org/2000/svg' ? document.createElementNS(node.namespaceURI, node.tagName) : document.createElement(tag);
    for (const a of node.attributes) {
      if (a.name.startsWith('on')) continue;
      if (a.name.startsWith('hint-')) continue;
      const v = a.value.includes('{{') ? interp(a.value, scope) : a.value;
      el.setAttribute(a.name, v);
    }
    for (const c of node.childNodes) render(c, scope, el);
    if (tag === 'textarea' && node.getAttribute('value')) el.value = interp(node.getAttribute('value'), scope);
    parent.appendChild(el);
  };
  const host = document.getElementById('host');
  for (const c of xdc.childNodes) render(c, vals, host);
};`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 2 });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => {
    const u = route.request().url();
    const body = execFileSync('curl', ['-sS', '-m', '20', '-A', UA, u], { maxBuffer: 50e6 });
    const ct = u.includes('gstatic') ? 'font/woff2' : 'text/css';
    route.fulfill({ status: 200, body, headers: { 'content-type': ct, 'access-control-allow-origin': '*' } });
  });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head><body><div id="host"></div></body></html>`);
  await page.addScriptTag({ content: runtime });
  const src = fs.readFileSync(path.join(SRC, j.file), 'utf8');
  await page.evaluate((s) => window.renderDC(s), src);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, j.out), fullPage: !!j.full });
  await page.close();
  console.log('ok', j.out);
}
await browser.close();
