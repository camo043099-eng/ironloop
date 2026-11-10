// Prueba de humo de Ironloop en Chromium real (Puppeteer): onboarding → hoy → rutina → cuerpo → sesión → progreso → salud.
import { createRequire } from 'node:module';
const puppeteer = createRequire('/tmp/package.json')('puppeteer');

const BASE = 'http://127.0.0.1:8931/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok ' : 'FALLO ') + msg); if (!cond) fallos++; };

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 880, deviceScaleFactor: 2 });
const errores = [];
page.on('pageerror', e => errores.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
await sleep(600);

ok(await page.$eval('#onboarding', el => el.classList.contains('activo')), 'sin perfil → onboarding visible');
await page.click('#ob-entendido'); await sleep(150);
ok(await page.$eval('#ob-form', el => el.style.display === ''), 'aviso aceptado → formulario visible');
await page.type('#ob-edad', '25'); await page.type('#ob-peso', '72');
await page.click('#ob-crear'); await sleep(400);
ok(await page.evaluate(() => !!JSON.parse(localStorage.getItem('fit.perfil') || 'null')), 'perfil guardado');
ok(await page.evaluate(() => JSON.parse(localStorage.getItem('fit.rutina')).semana.filter(Boolean).length === 3), 'rutina de 3 días generada');
ok(await page.$eval('#v-hoy', el => el.classList.contains('activa') && el.innerHTML.includes('EMPEZAR')), 'Hoy con sesión y EMPEZAR');
await page.screenshot({ path: 'tools/captura-hoy.png' });

await page.click('[data-vista="rutina"]'); await sleep(250);
ok(await page.$eval('#v-rutina', el => el.innerHTML.includes('Cambiar')), 'Rutina con botones Cambiar');
const antes = await page.evaluate(() => JSON.parse(localStorage.getItem('fit.rutina')).semana.flatMap(s => s ? s.bloques.map(b => b.ej) : []).join(','));
await page.click('[data-cambiar]'); await sleep(250);
const despues = await page.evaluate(() => JSON.parse(localStorage.getItem('fit.rutina')).semana.flatMap(s => s ? s.bloques.map(b => b.ej) : []).join(','));
ok(antes !== despues, 'Cambiar sustituye un ejercicio sin repetir');

await page.click('[data-vista="cuerpo"]'); await sleep(350);
const nCartas = await page.$$eval('#cuerpo-resultados .carta', els => els.length);
ok(nCartas === 60, 'Cuerpo muestra 60 tarjetas (' + nCartas + ')');
await page.click('#cuerpo-resultados .carta'); await sleep(600);
ok(await page.$eval('#hoja', el => el.classList.contains('abierta')), 'ficha abierta');
ok(await page.$$eval('#hoja ol.pasos li', els => els.length > 0), 'ficha con pasos en español');
await page.click('#ficha-cerrar'); await sleep(400);

await page.click('[data-vista="hoy"]'); await sleep(250);
await page.click('#hoy-empezar'); await sleep(500);
ok(await page.$eval('#v-sesion', el => el.classList.contains('activa')), 'sesión abierta');
ok((await page.$eval('#estado-txt', el => el.textContent)) === 'Prepárate', 'fase PREPARA');
await page.click('#c-saltar'); await sleep(400);
ok((await page.$eval('#estado-txt', el => el.textContent)) === 'A darle', 'fase TRABAJO');
await page.screenshot({ path: 'tools/captura-sesion.png' });
await page.click('#c-hecho'); await sleep(400);
ok((await page.$eval('#estado-txt', el => el.textContent)) === 'Descansa', 'fase DESCANSO');
await page.click('#c-terminar'); await sleep(400);
ok((await page.$eval('#estado-txt', el => el.textContent)) === 'Sesión completa', 'fase FIN');
ok(await page.evaluate(() => { const h = JSON.parse(localStorage.getItem('fit.historial') || '[]'); return h.length === 1 && h[0].series.length === 1; }), 'sesión registrada en el historial');
await page.click('#fin-volver'); await sleep(300);
await page.click('[data-vista="progreso"]'); await sleep(250);
ok(await page.$eval('#v-progreso', el => el.innerHTML.includes('series')), 'Progreso con historial');
await page.click('[data-vista="salud"]'); await sleep(250);
ok(await page.$eval('#v-salud', el => el.innerHTML.includes('Técnica segura')), 'Salud con secciones');
if (errores.length) { console.log('ERRORES DE PÁGINA:'); errores.slice(0, 8).forEach(e => console.log('  ' + e)); fallos++; }
console.log(fallos ? `\n${fallos} FALLOS` : '\nPRUEBA DE HUMO COMPLETA ✓');
await browser.close();
process.exit(fallos ? 1 : 0);
