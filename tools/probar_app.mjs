// Prueba de humo de Ironloop en Chromium real (Puppeteer):
// splash → cuenta → onboarding → hoy → guía → sesión → rutina → cuerpo → progreso → salud.
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
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(800);
ok(await page.$eval('#splash', el => !el.hidden), 'splash visible en arranque en frío');
await page.screenshot({ path: 'tools/captura-splash.png' });
await sleep(2600);
ok(await page.$eval('#v-cuenta', el => el.classList.contains('activa') && el.innerHTML.includes('Crea tu cuenta')), 'sin cuentas → crear cuenta');
await page.type('#cu-nombre', 'Alejo');
await page.click('#cu-crear'); await sleep(500);
ok(await page.$eval('#onboarding', el => el.classList.contains('activo')), 'cuenta creada → onboarding (aviso de salud)');
await page.click('#ob-entendido'); await sleep(150);
ok(await page.$eval('#ob-form', el => el.style.display === ''), 'aviso aceptado → formulario visible');
await page.type('#ob-edad', '25'); await page.type('#ob-peso', '72');
await page.click('#ob-crear'); await sleep(400);
const clave = await page.evaluate(() => {
  const id = JSON.parse(localStorage.getItem('fit.cuentas')).lista[0].id;
  return 'fit.c.' + id + '.';
});
ok(await page.evaluate(k => !!JSON.parse(localStorage.getItem(k + 'perfil') || 'null'), clave), 'perfil guardado en su cuenta');
ok(await page.evaluate(k => JSON.parse(localStorage.getItem(k + 'rutina')).semana.filter(Boolean).length === 3, clave), 'rutina de 3 días generada');
ok(await page.$eval('#v-hoy', el => el.classList.contains('activa') && el.innerHTML.includes('EMPEZAR')), 'Hoy con sesión y EMPEZAR');
ok(await page.$eval('#v-hoy', el => el.innerHTML.includes('Hola, Alejo')), 'Hoy saluda por la cuenta');
ok(await page.$eval('#v-hoy', el => !!el.querySelector('.guia-hoy')), 'Hoy muestra la línea de la guía');
ok(await page.$eval('#hdr-avatar', el => !el.hidden), 'avatar de la cuenta en la cabecera');
await page.screenshot({ path: 'tools/captura-hoy.png' });

await page.click('[data-vista="rutina"]'); await sleep(250);
ok(await page.$eval('#v-rutina', el => el.innerHTML.includes('Cambiar')), 'Rutina con botones Cambiar');
const antes = await page.evaluate(k => JSON.parse(localStorage.getItem(k + 'rutina')).semana.flatMap(s => s ? s.bloques.map(b => b.ej) : []).join(','), clave);
await page.click('[data-cambiar]'); await sleep(250);
const despues = await page.evaluate(k => JSON.parse(localStorage.getItem(k + 'rutina')).semana.flatMap(s => s ? s.bloques.map(b => b.ej) : []).join(','), clave);
ok(antes !== despues, 'Cambiar sustituye un ejercicio sin repetir');

await page.click('[data-vista="cuerpo"]'); await sleep(350);
const nCartas = await page.$$eval('#cuerpo-resultados .carta', els => els.length);
ok(nCartas === 60, 'Cuerpo muestra 60 tarjetas (' + nCartas + ')');
await page.click('#cuerpo-resultados .carta'); await sleep(600);
ok(await page.$eval('#hoja', el => el.classList.contains('abierta')), 'ficha abierta');
ok(await page.$$eval('#hoja ol.pasos li', els => els.length > 0), 'ficha con pasos en español');
await page.click('#ficha-cerrar'); await sleep(400);

await page.click('[data-vista="hoy"]'); await sleep(250);
await page.click('#hoy-empezar'); await sleep(400);
ok(await page.$eval('#hoja', el => el.classList.contains('abierta') && el.innerHTML.includes('Come y haz esto')), 'EMPEZAR abre la guía «Come y haz esto»');
await page.screenshot({ path: 'tools/captura-guia.png' });
await page.click('#prep-darle'); await sleep(500);
ok(await page.$eval('#v-sesion', el => el.classList.contains('activa')), 'sesión abierta');
ok((await page.$eval('#estado-txt', el => el.textContent)) === 'Prepárate', 'fase PREPARA');
await page.click('#c-saltar'); await sleep(400);
ok((await page.$eval('#estado-txt', el => el.textContent)) === 'A darle', 'fase TRABAJO');
await page.screenshot({ path: 'tools/captura-sesion.png' });
await page.click('#c-hecho'); await sleep(400);
ok(['Descansa', 'Cambia de lado'].includes(await page.$eval('#estado-txt', el => el.textContent)), 'fase DESCANSO o TRANSICION');
await page.click('#c-terminar'); await sleep(400);
ok((await page.$eval('#estado-txt', el => el.textContent)) === 'Sesión completa', 'fase FIN');
ok(await page.$eval('#siguiente', el => el.innerHTML.includes('Come y haz esto')), 'FIN muestra la guía «Después»');
ok(await page.evaluate(k => { const h = JSON.parse(localStorage.getItem(k + 'historial') || '[]'); return h.length === 1 && h[0].series.length === 1; }, clave), 'sesión registrada en el historial de su cuenta');
await page.click('#fin-volver'); await sleep(300);
await page.click('[data-vista="progreso"]'); await sleep(250);
ok(await page.$eval('#v-progreso', el => el.innerHTML.includes('series')), 'Progreso con historial');
await page.click('[data-vista="salud"]'); await sleep(250);
ok(await page.$eval('#v-salud', el => el.innerHTML.includes('Técnica segura')), 'Salud con secciones');
// Segunda carga: no debe repetir el splash en la misma sesión del navegador.
await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(700);
ok(await page.$eval('#splash', el => el.hidden), 'segunda carga sin splash (misma sesión)');
ok(await page.$eval('#v-hoy', el => el.classList.contains('activa')), 'segunda carga entra directo a Hoy (cuenta activa)');
if (errores.length) { console.log('ERRORES DE PÁGINA:'); errores.slice(0, 8).forEach(e => console.log('  ' + e)); fallos++; }
console.log(fallos ? `\n${fallos} FALLOS` : '\nPRUEBA DE HUMO COMPLETA ✓');
await browser.close();
process.exit(fallos ? 1 : 0);
