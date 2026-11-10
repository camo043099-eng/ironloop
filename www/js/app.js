// Ironloop — aplicación principal (router, vistas, onboarding)
import { D, cargarDatos, tablas, imgDe, vidDe } from './datos.js';
import * as A from './almacen.js';
import * as C from './cuentas.js';
import { icono } from './iconos.js';
import { generarRutina, elegirAlternativa } from './generador.js';
import { Sesion } from './sesion.js';
import { svgFrontal, svgDorsal, aplicarCalor } from './silueta.js';

const $ = s => document.querySelector(s);
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hoyIdx = () => (new Date().getDay() + 6) % 7;
function lunesDeEstaSemana() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() - hoyIdx() * 86400000);
}
function registrosSemana() {
  const desde = lunesDeEstaSemana().getTime();
  return A.historial().filter(r => new Date(r.ts).getTime() >= desde);
}
function mapaCalorSemana() {
  const mapa = {};
  for (const r of registrosSemana()) for (const s of r.series) {
    const e = D.porId.get(s.ej); if (!e) continue;
    mapa[e.o] = (mapa[e.o] || 0) + 1;
    for (const sec of e.s || []) mapa[sec] = (mapa[sec] || 0) + 0.5;
  }
  return mapa;
}
function detBloque(b) {
  const base = b.tiempo_s ? `${b.series} × ${b.tiempo_s} s` : `${b.series} × ${b.reps[0]}–${b.reps[1]} reps`;
  return base + (b.unilateral ? ' por lado' : '') + ` · descanso ${b.descanso_s} s` + (b.kg_sugerido ? ` · ~${b.kg_sugerido} kg` : '');
}

/* ---------- Router ---------- */
let vistaActual = 'hoy';
export function ir(vista) {
  vistaActual = vista;
  document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
  $('#v-' + vista).classList.add('activa');
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('activo', b.dataset.vista === vista));
  $('#nav').classList.toggle('oculta', vista === 'sesion' || vista === 'cuenta');
  ({ hoy: pintarHoy, cuerpo: pintarCuerpo, rutina: pintarRutina, progreso: pintarProgreso, salud: pintarSalud }[vista] || (() => {}))();
  window.scrollTo(0, 0);
}
document.querySelectorAll('#nav button').forEach(b => b.addEventListener('click', () => ir(b.dataset.vista)));

/* ---------- Splash de bienvenida ---------- */
// Solo en arranque en frío: una vez por sesión y si pasaron >30 min.
function tocaSplash() {
  try {
    if (sessionStorage.getItem('il.splash')) return false;
    const ts = Number(localStorage.getItem('il.splash_ts') || 0);
    return Date.now() - ts > 30 * 60000;
  } catch { return true; }
}
function mostrarSplash() {
  const el = $('#splash');
  if (!el || !tocaSplash()) return Promise.resolve();
  el.hidden = false;
  try {
    sessionStorage.setItem('il.splash', '1');
    localStorage.setItem('il.splash_ts', String(Date.now()));
  } catch { /* sin almacenamiento: se muestra igual */ }
  const reducido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducido) el.classList.add('estatico');
  const dur = reducido ? 450 : 1750;
  return new Promise(res => setTimeout(() => {
    el.classList.add('fuera');
    setTimeout(() => { el.hidden = true; el.classList.remove('fuera', 'estatico'); res(); }, 320);
  }, dur));
}

/* ---------- Arranque ---------- */
Promise.all([cargarDatos(), mostrarSplash()]).then(() => {
  const c = $('#cargando'); if (c) c.remove();
  arranque();
}).catch(() => { const c = $('#cargando'); if (c) c.textContent = 'No se pudieron cargar los datos.'; });

function arranque() {
  const lista = C.lista();
  if (!lista.length) {
    if (C.hayDatosViejos()) return pintarCuenta('migrar');
    return pintarCuenta('crear');
  }
  const act = C.activa();
  if (!act) return pintarCuenta('entrar');
  C.entrar(act.id);
  if (act.pin) return pedirPin({ titulo: 'Hola, ' + act.nombre, sub: 'Tu PIN de 4 dígitos' })
    .then(pin => {
      if (pin === null) return pintarCuenta('entrar');
      return C.validarPin(act, pin).then(ok => {
        if (ok) return entrarApp();
        pintarCuenta('pin-mal', act);
      });
    });
  entrarApp();
}
function entrarApp() {
  actualizarAvatar();
  const p = A.perfil();
  const pValido = p && D.prescripcion.objetivos[p.objetivo] &&
    D.prescripcion.objetivos[p.objetivo].por_nivel[p.nivel] &&
    D.prescripcion.divisiones[String(p.dias)];
  if (!pValido) mostrarOnboarding(true);
  else ir('hoy');
}
function actualizarAvatar() {
  const btn = $('#hdr-avatar');
  const c = C.activa();
  if (!btn) return;
  btn.hidden = !c;
  if (c) {
    btn.innerHTML = avatarHtml(c);
    btn.onclick = () => hojaCuenta();
  }
}
function avatarHtml(c) {
  const inicial = esc((c.nombre || '?').trim().charAt(0).toUpperCase() || '?');
  return `<span class="avatar" style="--color:${C.COLORES[c.color % C.COLORES.length]}">${inicial}</span>`;
}

/* ---------- Error global amable ---------- */
window.addEventListener('error', () => {
  if (document.getElementById('error-global')) return;
  const d = document.createElement('div');
  d.id = 'error-global';
  d.innerHTML = '<div class="eg-caja"><div class="eg-tit">Algo falló</div><p>Tu progreso está a salvo en este teléfono.</p><button class="btn btn-coral" onclick="location.reload()">Reintentar</button></div>';
  document.body.appendChild(d);
});

/* ---------- Onboarding ---------- */
function grupoOpciones(contenedor, valores, inicial, multiple, alCambiar) {
  const sel = new Set(Array.isArray(inicial) ? inicial : [inicial]);
  contenedor.innerHTML = '';
  for (const v of valores) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'opcion' + (sel.has(v.val) ? ' sel' : ''); b.innerHTML = v.etiqueta;
    b.addEventListener('click', () => {
      if (multiple) { sel.has(v.val) ? sel.delete(v.val) : sel.add(v.val); }
      else { sel.clear(); sel.add(v.val); }
      contenedor.querySelectorAll('.opcion').forEach(x => x.classList.remove('sel'));
      contenedor.querySelectorAll('.opcion').forEach((x, i) => { if (sel.has(valores[i].val)) x.classList.add('sel'); });
      alCambiar(multiple ? [...sel] : [...sel][0]);
    });
    contenedor.appendChild(b);
  }
  return () => (multiple ? [...sel] : [...sel][0]);
}
function mostrarOnboarding(primeraVez) {
  const ob = $('#onboarding');
  const previo = A.perfil() || {};
  ob.classList.add('activo');
  const equipos = [...new Set(D.ejercicios.map(e => e.e))].sort();
  const zonas = Object.entries(D.lesiones.zonas).map(([k, z]) => ({ val: k, etiqueta: z.etiqueta }));
  ob.innerHTML = `<div class="ob-inner">
    <div class="logo display"><span class="iron">IRON</span><span class="loop">LOOP</span></div>
    <h1>Tu tablero de entrenamiento</h1>
    ${primeraVez ? `<div class="aviso-salud"><b>Antes de empezar:</b> ${esc(D.salud.aviso)}</div>
    <button class="btn-empezar" id="ob-entendido">ENTIENDO, CONTINUAR</button>
    <div id="ob-form" style="display:none">` : '<div id="ob-form">'}
      <div class="campo"><label>Tu nombre</label><input type="text" id="ob-nombre" value="${esc(previo.nombre || '')}" placeholder="Ej.: Alejo"></div>
      <div class="campo"><label>Cuerpo</label><div class="opciones" id="ob-cuerpo"></div></div>
      <div class="dos-col">
        <div class="campo"><label>Edad</label><input type="number" id="ob-edad" min="10" max="100" value="${previo.edad || ''}" placeholder="25"></div>
        <div class="campo"><label>Peso (kg)</label><input type="number" id="ob-peso" min="30" max="250" value="${previo.peso_kg || ''}" placeholder="70"></div>
      </div>
      <div class="campo"><label>Nivel</label><div class="opciones" id="ob-nivel"></div></div>
      <div class="campo"><label>Objetivo</label><div class="opciones" id="ob-objetivo"></div></div>
      <div class="campo"><label>Días por semana</label><div class="opciones" id="ob-dias"></div></div>
      <div class="campo"><label>¿Dónde entrenas?</label><div class="opciones" id="ob-lugar"></div><div class="opciones" id="ob-equipo" style="display:none;margin-top:8px"></div></div>
      <div class="campo"><label>¿Algo que cuidar? (si no, déjalo así)</label><div class="opciones" id="ob-zonas"></div></div>
      <div class="error-form" id="ob-error"></div>
      <button class="btn-empezar" id="ob-crear">${primeraVez ? 'CREAR MI RUTINA' : 'GUARDAR Y REGENERAR'}</button>
      ${primeraVez ? '' : '<button class="btn" id="ob-cancelar" style="width:100%;margin-top:10px">Cancelar</button>'}
    </div></div>`;
  if (primeraVez) $('#ob-entendido').addEventListener('click', () => {
    $('#ob-entendido').remove(); $('#ob-form').style.display = '';
  });
  const leerCuerpo = grupoOpciones($('#ob-cuerpo'),
    [{ val: 'masculino', etiqueta: 'Hombre' }, { val: 'femenino', etiqueta: 'Mujer' }],
    previo.cuerpo || 'masculino', false, () => {});
  const leerNivel = grupoOpciones($('#ob-nivel'),
    [{ val: 'principiante', etiqueta: 'Principiante' }, { val: 'intermedio', etiqueta: 'Intermedio' }, { val: 'avanzado', etiqueta: 'Avanzado' }],
    previo.nivel || 'principiante', false, () => {});
  const leerObjetivo = grupoOpciones($('#ob-objetivo'),
    Object.entries(D.prescripcion.objetivos).map(([k, o]) => ({ val: k, etiqueta: o.nombre })),
    previo.objetivo || 'hipertrofia', false, () => {});
  const leerDias = grupoOpciones($('#ob-dias'),
    [2, 3, 4, 5].map(n => ({ val: n, etiqueta: n + ' días' })), previo.dias || 3, false, () => {});
  const EQUIPO_CASA = ['Peso corporal', 'Mancuernas', 'Banda', 'Banda de resistencia', 'Pesa rusa', 'Rueda abdominal'];
  const esDeCasa = eq => eq && eq.length <= EQUIPO_CASA.length && eq.every(x => EQUIPO_CASA.includes(x));
  const lugarPrevio = !previo.equipo ? 'gym' : (previo.equipo.length >= equipos.length ? 'gym' : (esDeCasa(previo.equipo) ? 'casa' : 'mano'));
  const leerEquipo = grupoOpciones($('#ob-equipo'),
    equipos.map(e => ({ val: e, etiqueta: e })), previo.equipo || ['Peso corporal'], true, () => {});
  const leerLugar = grupoOpciones($('#ob-lugar'),
    [{ val: 'gym', etiqueta: icono('gimnasio') + ' Gimnasio' }, { val: 'casa', etiqueta: icono('casa') + ' Casa' }, { val: 'mano', etiqueta: icono('mano') + ' Elegir a mano' }],
    lugarPrevio, false, () => { $('#ob-equipo').style.display = leerLugar() === 'mano' ? '' : 'none'; });
  $('#ob-equipo').style.display = lugarPrevio === 'mano' ? '' : 'none';
  const leerZonas = grupoOpciones($('#ob-zonas'), zonas, previo.zonas_lesionadas || [], true, () => {});
  const cancelar = $('#ob-cancelar');
  if (cancelar) cancelar.addEventListener('click', () => ob.classList.remove('activo'));
  $('#ob-crear').addEventListener('click', () => {
    const edad = parseInt($('#ob-edad').value, 10), peso = parseFloat($('#ob-peso').value);
    if (!(edad >= 10 && edad <= 100) || !(peso >= 30 && peso <= 250)) {
      $('#ob-error').textContent = 'Revisa la edad (10–100) y el peso (30–250 kg).'; return;
    }
    const lugar = leerLugar();
    const equipoSel = lugar === 'gym' ? [...equipos] : lugar === 'casa' ? [...EQUIPO_CASA] : leerEquipo();
    if (!equipoSel.includes('Peso corporal')) equipoSel.push('Peso corporal');
    const perfil = {
      nombre: $('#ob-nombre').value.trim(), cuerpo: leerCuerpo(), edad, peso_kg: peso,
      nivel: leerNivel(), objetivo: leerObjetivo(), dias: leerDias(),
      equipo: equipoSel, zonas_lesionadas: leerZonas(),
      semilla: (previo.semilla || Math.floor(Math.random() * 1e9)),
    };
    A.guardarPerfil(perfil);
    A.guardarRutina(generarRutina(perfil, D.ejercicios, tablas(), perfil.semilla));
    ob.classList.remove('activo');
    ir('hoy');
  });
}

/* ---------- HOY ---------- */
function pintarHoy() {
  const el = $('#v-hoy');
  const p = A.perfil(), r = A.rutina();
  if (!p || !r) { el.innerHTML = '<div class="vacio">Configura tu perfil para crear tu rutina.</div>'; return; }
  const regs = registrosSemana();
  const sesiones = regs.length;
  const minutos = Math.round(regs.reduce((t, x) => t + (x.duracion_s || 0), 0) / 60);
  const series = regs.reduce((t, x) => t + x.series.length, 0);
  const meta = Math.min(100, Math.round(sesiones / p.dias * 100));
  const porDia = DIAS.map((_, i) => {
    const dia = new Date(lunesDeEstaSemana().getTime() + i * 86400000).toDateString();
    return regs.filter(x => new Date(x.ts).toDateString() === dia)
      .reduce((t, x) => t + x.series.length, 0);
  });
  const maxBar = Math.max(10, ...porDia);
  const barras = porDia.map((v, i) => {
    const x = 14 + i * 47, h = Math.round(v / maxBar * 66), y = 84 - h;
    return `<rect x="${x}" y="${y}" width="26" height="${h}" rx="5" fill="${i === hoyIdx() ? '#FF6B3D' : '#2A3345'}"/>
      <text class="val" x="${x + 13}" y="${y - 5}" text-anchor="middle">${v || ''}</text>
      <text class="dia" x="${x + 13}" y="102" text-anchor="middle">${DIAS[i][0]}</text>`;
  }).join('');
  // Sesión de hoy o la próxima
  let sesion = r.semana[hoyIdx()], tituloSesion = 'Sesión de hoy', diaSes = hoyIdx();
  if (!sesion) for (let k = 1; k <= 7 && !sesion; k++) {
    const j = (hoyIdx() + k) % 7;
    if (r.semana[j]) { sesion = r.semana[j]; diaSes = j; tituloSesion = k === 1 ? 'Mañana entrenas' : 'Próxima sesión · ' + DIAS[j]; }
  }
  const bloquesHtml = sesion ? sesion.bloques.map(b => {
    const e = D.porId.get(b.ej);
    return `<div class="bloque"><img src="${imgDe(e.id)}" alt=""><div><div class="b-nom">${esc(e.ne)}</div><div class="b-det">${detBloque(b)}</div></div></div>`;
  }).join('') : '';
  const cuenta = C.activa();
  const primeraGuia = sesion && D.guia ? lineasGuia(sesion.sesion_id, 'antes').lineas[0] : null;
  el.innerHTML = `
  ${cuenta ? `<div class="hola display">Hola, ${esc(cuenta.nombre)}</div>` : ''}
  <div class="hoy-grid">
    <div class="silueta-wrap"><div id="hoy-silueta">${svgFrontal(A.perfil()?.cuerpo === 'femenino')}</div><div class="cap">Tu semana por músculo</div></div>
    <div class="metricas">
      <div class="metro"><div class="num">${sesiones}<span>/${p.dias}</span></div><div class="lbl">Sesiones</div></div>
      <div class="metro"><div class="num">${minutos}</div><div class="lbl">Minutos</div></div>
      <div class="metro"><div class="num">${series}</div><div class="lbl">Series</div></div>
      <div class="metro"><div class="num" style="color:var(--exito)">${meta}<span>%</span></div><div class="lbl">Meta semanal</div></div>
    </div>
  </div>
  <div class="barras-wrap"><h3 class="tit">Series por día</h3><svg id="barras" viewBox="0 0 340 110">${barras}</svg></div>
  ${A.sesionActiva() ? `<div class="continuar"><div><b>Sesión en curso</b><div class="c-det">${A.sesionActiva().hechas.length} series hechas · retómala donde ibas</div></div><div class="c-btns"><button class="btn btn-coral" id="hoy-continuar">CONTINUAR</button><button class="btn" id="hoy-descartar">Descartar</button></div></div>` : ''}
  ${sesion ? `<div class="sesion-hoy"><h3 class="tit">${tituloSesion}</h3>
    <div class="nombre display">${esc(sesion.nombre)}</div>
    <div class="detalle">${sesion.bloques.length} ejercicios · ~${sesion.duracion_est_min} min — con voz guía y descansos cronometrados.</div>
    ${primeraGuia ? `<div class="guia-hoy">${icono(primeraGuia.i)}<span>${esc(primeraGuia.t)}</span></div>` : ''}
    <div class="lista-bloques">${bloquesHtml}</div>
    <button class="btn-empezar" id="hoy-empezar">EMPEZAR</button></div>`
    : '<div class="tarjeta"><div class="vacio">No hay sesiones en tu rutina. Regenera desde la pestaña Rutina.</div></div>'}`;
  aplicarCalor($('#hoy-silueta'), mapaCalorSemana());
  const btn = $('#hoy-empezar');
  if (btn) btn.addEventListener('click', () => prepararSesion(sesion));
  const bc = $('#hoy-continuar');
  if (bc) bc.addEventListener('click', () => { const sa = A.sesionActiva(); if (sa) iniciarSesion(sa.bloques, sa); });
  const bd = $('#hoy-descartar');
  if (bd) bd.addEventListener('click', () => { A.borrarSesionActiva(); pintarHoy(); });
}

/* ---------- CUERPO ---------- */
let cuerpoVista = 'frontal', cuerpoFiltro = { texto: '', parte: '', equipo: '', musculo: '', favs: false };
function pintarCuerpo() {
  const el = $('#v-cuerpo');
  const partes = [...new Set(D.ejercicios.map(e => e.p))].sort();
  const equipos = [...new Set(D.ejercicios.map(e => e.e))].sort();
  el.innerHTML = `
  <div class="cuerpo-top">
    <div class="silueta-wrap"><div id="cuerpo-silueta">${cuerpoVista === 'frontal' ? svgFrontal(A.perfil()?.cuerpo === 'femenino') : svgDorsal(A.perfil()?.cuerpo === 'femenino')}</div><div class="cap">Toca un músculo</div></div>
    <div class="cuerpo-lado">
      <button class="btn vista-btn" id="cuerpo-girar">Ver ${cuerpoVista === 'frontal' ? 'espalda' : 'frente'}</button>
      <div class="tarjeta" style="margin-top:0"><h3 class="tit">Explorar</h3>
      <p style="color:var(--texto-2); font-size:13px; line-height:1.55; margin-top:8px">1.324 ejercicios con video y pasos en español. Toca un músculo de la silueta o busca por nombre.</p></div>
    </div>
  </div>
  <input class="busca" id="cuerpo-busca" type="search" placeholder="Buscar ejercicio… (ej.: press de banca)" value="${esc(cuerpoFiltro.texto)}">
  <div class="filtros">
    <select id="cuerpo-parte"><option value="">Toda parte</option>${partes.map(x => `<option ${x === cuerpoFiltro.parte ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
    <select id="cuerpo-equipo"><option value="">Todo equipo</option>${equipos.map(x => `<option ${x === cuerpoFiltro.equipo ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
    <button class="btn" id="cuerpo-favs" aria-pressed="${cuerpoFiltro.favs}">${icono('estrella')} Favoritos</button>
    ${cuerpoFiltro.musculo ? `<button class="btn btn-coral" id="cuerpo-limpiar">Músculo: ${esc(cuerpoFiltro.musculo)} ${icono('cerrar')}</button>` : ''}
  </div>
  <div id="cuerpo-resultados"></div>`;
  // Sin calor semanal aquí: en Cuerpo solo se marca lo que la persona toca.
  const selM = cuerpoFiltro.musculo;
  if (selM) {
    const n = D.ejercicios.filter(e => e.o === selM).length;
    $('#cuerpo-silueta').querySelectorAll('[data-m]').forEach(pth => {
      if (pth.dataset.m === selM) pth.classList.add('sel', 'salto');
    });
    const cap = $('#v-cuerpo .silueta-wrap .cap');
    if (cap) cap.textContent = selM + ' · ' + n + ' ejercicios';
  }
  $('#cuerpo-silueta').querySelectorAll('[data-m]').forEach(pth =>
    pth.addEventListener('click', () => {
      cuerpoFiltro.musculo = cuerpoFiltro.musculo === pth.dataset.m ? '' : pth.dataset.m;
      pintarCuerpo();
    }));
  $('#cuerpo-girar').addEventListener('click', () => { cuerpoVista = cuerpoVista === 'frontal' ? 'dorsal' : 'frontal'; pintarCuerpo(); });
  $('#cuerpo-busca').addEventListener('input', e => { cuerpoFiltro.texto = e.target.value; pintarResultados(); });
  $('#cuerpo-parte').addEventListener('change', e => { cuerpoFiltro.parte = e.target.value; pintarResultados(); });
  $('#cuerpo-equipo').addEventListener('change', e => { cuerpoFiltro.equipo = e.target.value; pintarResultados(); });
  $('#cuerpo-favs').addEventListener('click', e => { cuerpoFiltro.favs = !cuerpoFiltro.favs; e.target.setAttribute('aria-pressed', cuerpoFiltro.favs); pintarResultados(); });
  const limpiar = $('#cuerpo-limpiar');
  if (limpiar) limpiar.addEventListener('click', () => { cuerpoFiltro.musculo = ''; pintarCuerpo(); });
  pintarResultados();
}
const normTxt = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function pintarResultados() {
  const cont = $('#cuerpo-resultados');
  if (!cont) return;
  const f = cuerpoFiltro, favs = A.favoritos();
  const norm = normTxt(f.texto);
  let lista = D.ejercicios.filter(e =>
    (!f.musculo || e.o === f.musculo) &&
    (!f.parte || e.p === f.parte) &&
    (!f.equipo || e.e === f.equipo) &&
    (!f.favs || favs.has(e.id)) &&
    (!norm || e.buscar.includes(norm)));
  const total = lista.length;
  lista = lista.slice(0, 60);
  cont.innerHTML = `<p style="color:var(--texto-3); font-size:13px; margin-top:12px">${total} ejercicios${total > 60 ? ' — mostrando 60, afina la búsqueda' : ''}</p>
  <div class="parrilla">${lista.map(e => `
    <button class="carta" data-ficha="${e.id}"><img loading="lazy" src="${imgDe(e.id)}" alt="">
    <div class="c-nom">${esc(e.ne)}${favs.has(e.id) ? ' <span class="fav-ic">' + icono('estrella') + '</span>' : ''}</div><div class="c-det">${esc(e.p)} · ${esc(e.e)}</div></button>`).join('')}</div>`;
  cont.querySelectorAll('[data-ficha]').forEach(b => b.addEventListener('click', () => abrirFicha(b.dataset.ficha)));
}
function abrirFicha(id) {
  const e = D.porId.get(id);
  if (!e) return;
  const hoja = $('#hoja'), fondo = $('#hoja-fondo');
  const esFav = A.favoritos().has(id);
  hoja.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center">
      <h3 class="tit">${esc(e.p)} · ${esc(e.o)}</h3>
      <button class="btn" id="ficha-cerrar">Cerrar ${icono('cerrar')}</button>
    </div>
    <video class="ficha-video" src="${vidDe(e.id)}" poster="${imgDe(e.id)}" autoplay loop muted playsinline></video>
    <div class="f-nom">${esc(e.ne)}</div><div class="f-en">${esc(e.n)}</div>
    <div class="chips">
      <span class="chip">Equipo <b>${esc(e.e)}</b></span>
      <span class="chip">Objetivo <b>${esc(e.o)}</b></span>
      ${e.m ? `<span class="chip">Músculo <b>${esc(e.m)}</b></span>` : ''}
      ${(e.s || []).map(s => `<span class="chip">+ ${esc(s)}</span>`).join('')}
    </div>
    <ol class="pasos">${(e.pasos || []).map(p => `<li>${esc(p)}</li>`).join('')}</ol>
    <div class="fila-fav">
      <button class="btn btn-fav" id="ficha-fav" aria-pressed="${esFav}">${icono('estrella')} ${esFav ? 'En favoritos' : 'Añadir a favoritos'}</button>
    </div>
    <p class="atribucion">© Gym visual — https://gymvisual.com/</p>`;
  hoja.classList.add('abierta'); fondo.classList.add('abierto'); hoja.setAttribute('aria-hidden', 'false');
  const vf = hoja.querySelector('video');
  if (vf) vf.addEventListener('loadeddata', () => vf.classList.add('listo'));
  const cerrar = () => { hoja.classList.remove('abierta'); fondo.classList.remove('abierto'); hoja.setAttribute('aria-hidden', 'true'); const v = hoja.querySelector('video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } };
  $('#ficha-cerrar').addEventListener('click', cerrar);
  fondo.onclick = cerrar;
  $('#ficha-fav').addEventListener('click', ev => {
    const ahora = A.alternarFavorito(id);
    ev.target.setAttribute('aria-pressed', ahora);
    ev.target.innerHTML = icono('estrella') + (ahora ? ' En favoritos' : ' Añadir a favoritos');
    pintarResultados();
  });
}

/* ---------- RUTINA ---------- */
function pintarRutina() {
  const el = $('#v-rutina');
  const p = A.perfil(), r = A.rutina();
  if (!p || !r) { el.innerHTML = '<div class="vacio">Primero configura tu perfil.</div>'; return; }
  const division = D.prescripcion.divisiones[String(p.dias)];
  el.innerHTML = `
    <div class="tarjeta" style="margin-top:10px">
      <h3 class="tit">${esc(division ? division.nombre : 'Tu semana')}</h3>
      <p style="color:var(--texto-2); font-size:13px; line-height:1.55; margin-top:8px">
        ${esc(D.prescripcion.objetivos[p.objetivo].nombre)} · ${esc(p.nivel)} · ${p.dias} días/semana.
        Generada con tus filtros de equipo${p.zonas_lesionadas.filter(z => D.lesiones.zonas[z]).length ? ' y lesión (' + p.zonas_lesionadas.filter(z => D.lesiones.zonas[z]).map(z => D.lesiones.zonas[z].etiqueta).join(', ') + ')' : ''}.</p>
      <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap">
        <button class="btn" id="rut-regenerar">Regenerar rutina</button>
        <button class="btn" id="rut-perfil">Editar perfil</button>
      </div>
    </div>
    ${(r.advertencias || []).length ? `<div class="advertencias">${r.advertencias.map(esc).join('<br>')}</div>` : ''}
    ${DIAS.map((dia, i) => {
      const s = r.semana[i];
      if (!s) return `<div class="dia-cab"><span class="d-nom" style="color:var(--texto-3)">${dia}</span><span class="d-fecha">Descanso</span></div>`;
      return `<div class="dia-cab"><span class="d-nom">${dia}</span><span class="d-fecha">${esc(s.nombre)} · ~${s.duracion_est_min} min</span></div>
      <div class="lista-bloques">${s.bloques.map((b, bi) => {
        const e = D.porId.get(b.ej);
        return `<div class="bloque"><img src="${imgDe(e.id)}" alt=""><div><div class="b-nom">${esc(e.ne)}</div>
          <div class="b-det">${detBloque(b)}${b.nota ? '<br>' + esc(b.nota) : ''}</div></div>
          <button class="btn b-cambiar" data-cambiar="${i}:${bi}">Cambiar</button></div>`;
      }).join('')}</div>
      <button class="btn btn-coral" data-empezar-dia="${i}" style="width:100%; margin-top:10px">EMPEZAR ${esc(s.nombre).toUpperCase()}</button>`;
    }).join('')}`;
  $('#rut-regenerar').addEventListener('click', () => {
    const p2 = A.perfil(); p2.semilla = Math.floor(Math.random() * 1e9); A.guardarPerfil(p2);
    A.guardarRutina(generarRutina(p2, D.ejercicios, tablas(), p2.semilla));
    pintarRutina();
  });
  $('#rut-perfil').addEventListener('click', () => mostrarOnboarding(false));
  el.querySelectorAll('[data-cambiar]').forEach(btn => btn.addEventListener('click', () => {
    const [di, bi] = btn.dataset.cambiar.split(':').map(Number);
    const r2 = A.rutina(), bloque = r2.semana[di].bloques[bi];
    const ids = r2.semana.flatMap(s => s ? s.bloques.map(b => b.ej) : []);
    const alt = elegirAlternativa(A.perfil(), D.ejercicios, tablas(), bloque.grupo, bloque.rol, ids, Math.floor(Math.random() * 1e9));
    if (alt) { r2.semana[di].bloques[bi] = alt; A.guardarRutina(r2); pintarRutina(); }
    else btn.textContent = 'Sin alternativa';
  }));
  el.querySelectorAll('[data-empezar-dia]').forEach(btn => btn.addEventListener('click', () => {
    const s = A.rutina().semana[Number(btn.dataset.empezarDia)];
    if (s) prepararSesion(s);
  }));
}

/* ---------- SESIÓN GUIADA ---------- */
const FASE_COLOR = { PREPARA: '#9C8CFF', TRABAJO: '#FF6B3D', DESCANSO: '#35D5C3', TRANSICION: '#9C8CFF', FIN: '#B6F24A' };
const FASE_TXT = { PREPARA: 'Prepárate', TRABAJO: 'A darle', DESCANSO: 'Descansa', TRANSICION: 'Cambia de lado', FIN: 'Sesión completa' };
let sesionActiva = null, ultimaVid = null, ultimoControles = '', wakeLock = null;
let ultimaFirmaSesion = '', preVid = null, preVidSrc = null, sesionGuiaId = null;
function mmss(ms) { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function iniciarSesion(bloques, reanudar = null, sesionId = null) {
  if (!bloques || !bloques.length) return;
  sesionGuiaId = sesionId || (reanudar && reanudar.sesion_id) || null;
  if (sesionActiva) { sesionActiva.detener(); sesionActiva = null; }
  ir('sesion');
  ultimaVid = null; ultimoControles = ''; ultimaFirmaSesion = ''; preVidSrc = null;
  sesionActiva = new Sesion(bloques, D.porId, D.voz, pintarSesion, reg => {
    A.registrarSesion(reg);
    A.borrarSesionActiva();
    if (wakeLock) { try { wakeLock.release(); } catch { } wakeLock = null; }
  });
  if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { wakeLock = w; }).catch(() => {});
  if (reanudar) sesionActiva.continuar(reanudar); else sesionActiva.iniciar();
}
function pintarSesion(s) {
  if (!s) return;
  $('#v-sesion').dataset.fase = s.fase;
  // Persistir el avance al cambiar algo relevante: si la app muere, Hoy
  // ofrecerá continuar en el mismo bloque y serie, sin duplicar series.
  const firma = [s.fase, s.iEj, s.serie, s.lado, s.hechas.length, s.pausa ? 1 : 0].join('|');
  if (firma !== ultimaFirmaSesion) {
    ultimaFirmaSesion = firma;
    if (s.fase !== 'FIN' && s.fase !== 'INACTIVA') {
      A.guardarSesionActiva({ bloques: s.bloques, iEj: s.iEj, serie: s.serie, lado: s.lado, hechas: s.hechas, tInicio: s.tInicio, ts: Date.now(), sesion_id: sesionGuiaId });
    }
  }
  const color = FASE_COLOR[s.fase] || '#9C8CFF';
  $('#resplandor').style.background = `radial-gradient(circle at 50% 36%, ${color}38, transparent 72%)`;
  $('#estado-txt').textContent = s.pausa ? 'En pausa' : (FASE_TXT[s.fase] || s.fase);
  $('#estado-txt').style.color = color;
  const anillo = $('#anillo');
  anillo.setAttribute('stroke', color);
  let frac = 1;
  if (s.fase === 'TRABAJO' && !s.bloque.tiempo_s) {
    const total = s.bloques.reduce((t, b) => t + b.series * (b.unilateral ? 2 : 1), 0);
    frac = total ? s.hechas.length / total : 0;
    $('#reloj').textContent = mmss(s.dur - s.restanteMs());
  } else if (s.fase === 'FIN') { $('#reloj').textContent = '✓'; frac = 1; }
  else { frac = s.dur ? 1 - s.restanteMs() / s.dur : 0; $('#reloj').textContent = mmss(s.restanteMs()); }
  anillo.setAttribute('stroke-dashoffset', String(766.5 * (1 - Math.min(1, Math.max(0, frac)))));
  const e = s.ejercicio, b = s.bloque;
  if (e && ultimaVid !== e.id && s.fase !== 'FIN') {
    ultimaVid = e.id;
    const v = $('#vid'); v.poster = imgDe(e.id); v.src = vidDe(e.id); v.play().catch(() => {});
  }
  $('#ej-nombre').textContent = s.fase === 'FIN' ? 'Buen trabajo' : (e ? e.ne : '');
  $('#ej-meta').textContent = s.fase === 'FIN' ? '' :
    `Serie ${s.serie} de ${b.series}${b.unilateral ? ' · lado ' + s.lado : ''} · ` +
    (b.tiempo_s ? b.tiempo_s + ' s' : (b.reps[0] + '–' + b.reps[1] + ' reps')) +
    (s.fase === 'DESCANSO' ? ` · descanso ${b.descanso_s} s` : '');
  const sig = $('#siguiente');
  if (s.fase === 'FIN') {
    const mins = s.hechas.length ? Math.max(1, Math.round((Date.now() - s.tInicio) / 60000)) : 0;
    const unicos = new Set(s.hechas.map(h => h.ej)).size;
    sig.innerHTML = `<div class="fin-stats"><div><b>${s.hechas.length}</b><span>series</span></div><div><b>${unicos}</b><span>ejercicios</span></div><div><b>${mins}</b><span>min</span></div></div>
      ${sesionGuiaId && D.guia ? tarjetaGuiaHtml(sesionGuiaId, 'despues') : ''}
      <button class="btn btn-coral" id="fin-volver">VOLVER A HOY</button>`;
    $('#fin-volver').addEventListener('click', () => ir('hoy'));
  } else if (s.fase === 'DESCANSO' || s.fase === 'TRANSICION') {
    // Tras hecho(), el estado YA apunta a lo que sigue: bloque y serie actuales.
    sig.textContent = s.fase === 'TRANSICION'
      ? 'Sigue: ' + e.ne + ' — otro lado'
      : 'Sigue: ' + e.ne + (s.serie > 1 ? ' — serie ' + s.serie : '');
    // Precargar el video del siguiente ejercicio para que el cambio sea instantáneo.
    if (s.serie === 1 && s.iEj < s.bloques.length - 1) {
      const sigEj = D.porId.get(s.bloques[s.iEj + 1].ej);
      if (sigEj && preVidSrc !== sigEj.id) {
        preVidSrc = sigEj.id;
        if (!preVid) { preVid = document.createElement('video'); preVid.muted = true; preVid.preload = 'auto'; }
        preVid.src = vidDe(sigEj.id);
      }
    }
  } else sig.textContent = 'Ejercicio ' + (s.iEj + 1) + ' de ' + s.bloques.length;
  const clave = s.fase + '|' + s.pausa;
  if (clave !== ultimoControles) {
    ultimoControles = clave;
    const c = $('#controles');
    if (s.fase === 'FIN') { c.innerHTML = ''; return; }
    if (s.fase === 'TRABAJO') {
      c.innerHTML = `<button class="btn btn-hecho" id="c-hecho">HECHO ✓</button>
        <button class="btn" id="c-pausa">${s.pausa ? 'Continuar' : 'Pausa'}</button>
        <button class="btn" id="c-terminar">Terminar</button>`;
      $('#c-hecho').addEventListener('click', () => s.hecho());
    } else {
      c.innerHTML = `${s.fase !== 'PREPARA' ? '<button class="btn" id="c-mas15">+15 s</button>' : ''}
        <button class="btn" id="c-saltar">Saltar ▸</button>
        <button class="btn" id="c-pausa">${s.pausa ? 'Continuar' : 'Pausa'}</button>
        <button class="btn" id="c-terminar">Terminar</button>`;
      const m = $('#c-mas15'); if (m) m.addEventListener('click', () => s.mas15());
      $('#c-saltar').addEventListener('click', () => s.saltar());
    }
    $('#c-pausa').addEventListener('click', () => s.pausaToggle());
    $('#c-terminar').addEventListener('click', () => s.terminar());
  }
}

/* ---------- PROGRESO ---------- */
function anilloSVG(frac, color) {
  const c = 163.4;
  return `<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="#232B3A" stroke-width="7"/>
  <circle cx="32" cy="32" r="26" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, frac))}" transform="rotate(-90 32 32)"/></svg>`;
}
function pintarProgreso() {
  const el = $('#v-progreso');
  const p = A.perfil(), h = A.historial(), regs = registrosSemana();
  const sesSem = regs.length, minSem = Math.round(regs.reduce((t, x) => t + (x.duracion_s || 0), 0) / 60);
  const serSem = regs.reduce((t, x) => t + x.series.length, 0);
  const metaSeries = (p ? p.dias : 3) * 12;
  el.innerHTML = `
  <div class="anillos">
    <div class="anillo-caja">${anilloSVG(p ? sesSem / p.dias : 0, '#FF6B3D')}<div class="a-num">${sesSem}/${p ? p.dias : '–'}</div><div class="a-lbl">Sesiones semana</div></div>
    <div class="anillo-caja">${anilloSVG(Math.min(1, minSem / 150), '#35D5C3')}<div class="a-num">${minSem}</div><div class="a-lbl">Minutos semana</div></div>
    <div class="anillo-caja">${anilloSVG(Math.min(1, serSem / metaSeries), '#B6F24A')}<div class="a-num">${serSem}</div><div class="a-lbl">Series semana</div></div>
  </div>
  <div class="tarjeta"><h3 class="tit">Historial</h3>
  ${h.length ? [...h].reverse().slice(0, 20).map(r => {
    const f = new Date(r.ts);
    return `<div class="hist-item"><div>${f.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}<div class="h-det">${r.completada ? 'Completada' : 'Parcial'}</div></div>
    <div>${r.series.length} series · ${Math.max(1, Math.round((r.duracion_s || 0) / 60))} min</div></div>`;
  }).join('') : '<div class="vacio">Todavía no hay sesiones. Tu primera sesión aparecerá aquí.</div>'}
  </div>`;
}

/* ---------- SALUD ---------- */
function pintarSalud() {
  const el = $('#v-salud');
  const aj = A.ajustes(), p = A.perfil();
  el.innerHTML = `
  <div class="aviso-salud">${esc(D.salud.aviso)}</div>
  <div class="acordeon">${D.salud.secciones.map((s, i) => `
    <div class="acor ${i === 0 ? 'abierto' : ''}"><button data-acor="${i}">${esc(s.titulo)}<span>▾</span></button>
    <div class="cuerpo"><ul>${s.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`).join('')}
  </div>
  <div class="tarjeta"><h3 class="tit">Guía de sesión</h3>
    ${[['voz', 'Voz guía'], ['pitidos', 'Pitidos de aviso'], ['vibracion', 'Vibración']].map(([k, et]) => `
    <div class="interruptor"><span>${et}</span><button data-ajuste="${k}" aria-pressed="${!!aj[k]}" aria-label="${et}"></button></div>`).join('')}
  </div>
  ${p ? `<div class="tarjeta"><h3 class="tit">Mi perfil</h3>
    <p style="color:var(--texto-2); font-size:14px; line-height:1.6; margin-top:8px">${esc(p.nombre || 'Sin nombre')} · ${p.edad} años · ${p.peso_kg} kg · ${esc(p.nivel)} · ${esc(D.prescripcion.objetivos[p.objetivo].nombre)} · ${p.dias} días/semana${p.zonas_lesionadas.filter(z => D.lesiones.zonas[z]).length ? ' · cuidando: ' + p.zonas_lesionadas.filter(z => D.lesiones.zonas[z]).map(z => D.lesiones.zonas[z].etiqueta).join(', ') : ''}</p>
    <button class="btn" id="salud-perfil" style="margin-top:12px">Rehacer perfil y rutina</button>
    <button class="btn" id="salud-cuenta" style="margin-top:8px">Mi cuenta</button></div>` : ''}
  <p class="atribucion">Animaciones e imágenes: © Gym visual — https://gymvisual.com/<br>Ironloop no es un médico: ante dolor o una condición de salud, consulta a un profesional.</p>`;
  el.querySelectorAll('[data-acor]').forEach(b => b.addEventListener('click', () => b.parentElement.classList.toggle('abierto')));
  el.querySelectorAll('[data-ajuste]').forEach(b => b.addEventListener('click', () => {
    const a2 = A.ajustes(); a2[b.dataset.ajuste] = !a2[b.dataset.ajuste];
    A.guardarAjustes(a2); b.setAttribute('aria-pressed', a2[b.dataset.ajuste]);
  }));
  const bp = $('#salud-perfil');
  if (bp) bp.addEventListener('click', () => mostrarOnboarding(false));
  const bc2 = $('#salud-cuenta');
  if (bc2) bc2.addEventListener('click', () => hojaCuenta());
}

/* ---------- Guía por rutina: «Come y haz esto» ---------- */
function enfoqueDe(sesionId) { return (D.guia && D.guia.sesiones[sesionId]) || 'general'; }
function lineasGuia(sesionId, cara) {
  if (!D.guia) return { nombre: '', lineas: [] };
  const enf = D.guia.enfoques[enfoqueDe(sesionId)] || D.guia.enfoques.general;
  const lineas = [...(enf[cara] || [])];
  const p = A.perfil();
  const extra = p && D.guia.objetivos && D.guia.objetivos[p.objetivo] && D.guia.objetivos[p.objetivo][cara];
  if (extra && lineas.length < 4) lineas.push(extra);
  return { nombre: enf.nombre, lineas };
}
function tarjetaGuiaHtml(sesionId, cara) {
  const { nombre, lineas } = lineasGuia(sesionId, cara);
  return `<div class="guia-card"><div class="guia-cab"><h3 class="tit">Come y haz esto</h3><span class="guia-enf">${esc(nombre)} · ${cara === 'antes' ? 'Antes' : 'Después'}</span></div>
  ${lineas.map(l => `<div class="guia-linea"><span class="guia-ic">${icono(l.i)}</span><span>${esc(l.t)}</span></div>`).join('')}
  <p class="guia-aviso">${esc(D.guia.aviso)}</p></div>`;
}
function prepararSesion(sesion) {
  if (!sesion) return;
  if (!D.guia) { iniciarSesion(sesion.bloques, null, sesion.sesion_id); return; }
  abrirHojaSimple(tarjetaGuiaHtml(sesion.sesion_id, 'antes') +
    '<button class="btn-empezar" id="prep-darle">A DARLE</button>');
  $('#prep-darle').addEventListener('click', () => {
    cerrarHojaSimple();
    iniciarSesion(sesion.bloques, null, sesion.sesion_id);
  });
}

/* ---------- Hoja inferior genérica ---------- */
function abrirHojaSimple(html) {
  const hoja = $('#hoja'), fondo = $('#hoja-fondo');
  hoja.innerHTML = html;
  hoja.classList.add('abierta'); fondo.classList.add('abierto');
  hoja.setAttribute('aria-hidden', 'false');
  fondo.onclick = cerrarHojaSimple;
}
function cerrarHojaSimple() {
  const hoja = $('#hoja'), fondo = $('#hoja-fondo');
  hoja.classList.remove('abierta'); fondo.classList.remove('abierto');
  hoja.setAttribute('aria-hidden', 'true');
}

/* ---------- Cuentas personales (100 % local) ---------- */
function pintarCuenta(modo, dato = null) {
  const el = $('#v-cuenta');
  if (modo === 'crear') {
    el.innerHTML = `<div class="cuenta-box">
      <div class="logo display"><span class="iron">IRON</span><span class="loop">LOOP</span></div>
      <h1>Crea tu cuenta</h1>
      <p class="cuenta-sub">Solo tu nombre. Todo queda en este teléfono.</p>
      <div class="campo"><label>Tu nombre</label><input type="text" id="cu-nombre" maxlength="16" placeholder="Ej.: Alejo"></div>
      <button class="btn btn-pin-toggle" id="cu-pin-toggle">${icono('candado')} PIN de 4 dígitos (opcional)</button>
      <div class="campo" id="cu-pin-campo" style="display:none"><label>PIN</label><input type="password" id="cu-pin" inputmode="numeric" maxlength="4" placeholder="••••"></div>
      <div class="error-form" id="cu-error"></div>
      <button class="btn-empezar" id="cu-crear">CREAR</button>
      ${C.lista().length ? '<button class="btn" id="cu-ya" style="width:100%;margin-top:10px">Ya tengo cuenta</button>' : ''}
    </div>`;
    ir('cuenta');
    $('#cu-pin-toggle').addEventListener('click', () => {
      const c = $('#cu-pin-campo');
      c.style.display = c.style.display === 'none' ? '' : 'none';
    });
    const ya = $('#cu-ya');
    if (ya) ya.addEventListener('click', () => pintarCuenta('entrar'));
    $('#cu-crear').addEventListener('click', async () => {
      const nombre = $('#cu-nombre').value;
      const pin = $('#cu-pin-campo').style.display === 'none' ? '' : $('#cu-pin').value.trim();
      if (pin && !/^\d{4}$/.test(pin)) { $('#cu-error').textContent = 'El PIN son 4 dígitos.'; return; }
      const { cuenta, error } = C.crear(nombre);
      if (error) { $('#cu-error').textContent = error; return; }
      if (pin) await C.fijarPin(cuenta.id, pin);
      C.entrar(cuenta.id);
      entrarApp();
    });
    return;
  }
  if (modo === 'entrar') {
    el.innerHTML = `<div class="cuenta-box">
      <h1>¿Quién entrena?</h1>
      <div class="cuenta-lista">${C.lista().map(c => `
        <button class="cuenta-ficha" data-entrar="${c.id}">${avatarHtml(c)}<span class="cf-nom">${esc(c.nombre)}</span>${c.pin ? `<span class="cf-pin">${icono('candado')}</span>` : ''}</button>`).join('')}
      </div>
      <button class="btn" id="cu-nueva" style="width:100%;margin-top:12px">${icono('mas')} Nueva cuenta</button>
    </div>`;
    ir('cuenta');
    el.querySelectorAll('[data-entrar]').forEach(b => b.addEventListener('click', async () => {
      const c = C.lista().find(x => x.id === b.dataset.entrar);
      if (!c) return;
      if (!c.pin) { C.entrar(c.id); entrarApp(); return; }
      const pin = await pedirPin({ titulo: 'Hola, ' + c.nombre, sub: 'Tu PIN de 4 dígitos' });
      if (pin === null) return pintarCuenta('entrar');
      if (await C.validarPin(c, pin)) { C.entrar(c.id); entrarApp(); }
      else pintarCuenta('pin-mal', c);
    }));
    $('#cu-nueva').addEventListener('click', () => pintarCuenta('crear'));
    return;
  }
  if (modo === 'migrar') {
    el.innerHTML = `<div class="cuenta-box">
      <div class="logo display"><span class="iron">IRON</span><span class="loop">LOOP</span></div>
      <h1>Tu cuenta</h1>
      <p class="cuenta-sub">Tu progreso pasa a tu cuenta. No pierdes nada.</p>
      <div class="campo"><label>Tu nombre</label><input type="text" id="cu-nombre" maxlength="16" value="Yo"></div>
      <div class="error-form" id="cu-error"></div>
      <button class="btn-empezar" id="cu-migrar">CONTINUAR</button>
    </div>`;
    ir('cuenta');
    $('#cu-migrar').addEventListener('click', () => {
      const { error } = C.migrar($('#cu-nombre').value);
      if (error) { $('#cu-error').textContent = error; return; }
      entrarApp();
    });
    return;
  }
  if (modo === 'pin-mal') {
    pinFallos++;
    const espera = pinFallos >= 3 ? Math.ceil((pinBloqueoHasta - Date.now()) / 1000) : 0;
    el.innerHTML = `<div class="cuenta-box">
      <h1>PIN incorrecto</h1>
      <p class="cuenta-sub">${espera > 0 ? 'Demasiados intentos. Espera ' + espera + ' s.' : 'Ese no era. Intenta de nuevo.'}</p>
      <button class="btn-empezar" id="cu-reintentar" ${espera > 0 ? 'disabled' : ''}>REINTENTAR</button>
      <button class="btn" id="cu-olvide" style="width:100%;margin-top:10px">Lo olvidé</button>
      <button class="btn" id="cu-cambiar2" style="width:100%;margin-top:8px">Cambiar cuenta</button>
    </div>`;
    ir('cuenta');
    const re = $('#cu-reintentar');
    if (re) re.addEventListener('click', async () => {
      const pin = await pedirPin({ titulo: 'Hola, ' + dato.nombre, sub: 'Tu PIN de 4 dígitos' });
      if (pin === null) return pintarCuenta('entrar');
      if (await C.validarPin(dato, pin)) { pinFallos = 0; C.entrar(dato.id); entrarApp(); }
      else pintarCuenta('pin-mal', dato);
    });
    $('#cu-olvide').addEventListener('click', () => pintarCuenta('olvido', dato));
    $('#cu-cambiar2').addEventListener('click', () => pintarCuenta('entrar'));
    return;
  }
  if (modo === 'olvido') {
    el.innerHTML = `<div class="cuenta-box">
      <h1>Sin PIN no hay acceso</h1>
      <p class="cuenta-sub">La cuenta vive solo en este teléfono: no hay forma de recuperar el PIN. Puedes borrar la cuenta de ${esc(dato.nombre)} y crear una nueva.</p>
      <button class="btn btn-peligro" id="cu-borrar-def" style="width:100%">Borrar cuenta</button>
      <button class="btn" id="cu-volver3" style="width:100%;margin-top:10px">Volver</button>
    </div>`;
    ir('cuenta');
    let armado = false;
    $('#cu-borrar-def').addEventListener('click', ev => {
      if (!armado) { armado = true; ev.target.textContent = '¿Seguro? Se borra todo'; return; }
      C.borrar(dato.id);
      pintarCuenta(C.lista().length ? 'entrar' : 'crear');
    });
    $('#cu-volver3').addEventListener('click', () => pintarCuenta('entrar'));
  }
}

/* PIN con teclado propio: devuelve el PIN o null si la persona vuelve. */
let pinResolver = null, pinFallos = 0, pinBloqueoHasta = 0;
function pedirPin({ titulo, sub = '' }) {
  if (pinFallos >= 3 && Date.now() >= pinBloqueoHasta) pinFallos = 0;
  if (pinFallos >= 3) pinBloqueoHasta = Math.max(pinBloqueoHasta, Date.now() + 30000);
  return new Promise(res => {
    pinResolver = res;
    let entrada = '';
    const el = $('#v-cuenta');
    const bloqueado = Date.now() < pinBloqueoHasta;
    el.innerHTML = `<div class="cuenta-box">
      <h1>${esc(titulo)}</h1>
      ${sub ? `<p class="cuenta-sub">${esc(sub)}</p>` : ''}
      ${bloqueado ? '<p class="cuenta-sub">Demasiados intentos. Espera unos segundos.</p>' : ''}
      <div class="pin-puntos">${'<span></span>'.repeat(4)}</div>
      <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(d =>
        d === '' ? '<span></span>' : `<button data-pin="${d}" ${bloqueado ? 'disabled' : ''}>${d}</button>`).join('')}
      </div>
      <button class="btn" id="pin-volver" style="width:100%;margin-top:12px">Volver</button>
    </div>`;
    ir('cuenta');
    const puntos = el.querySelectorAll('.pin-puntos span');
    el.querySelectorAll('[data-pin]').forEach(b => b.addEventListener('click', () => {
      const d = b.dataset.pin;
      if (d === '⌫') entrada = entrada.slice(0, -1);
      else if (entrada.length < 4) entrada += d;
      puntos.forEach((p, i) => p.classList.toggle('lleno', i < entrada.length));
      if (entrada.length === 4) { const r = pinResolver; pinResolver = null; if (r) r(entrada); }
    }));
    $('#pin-volver').addEventListener('click', () => { const r = pinResolver; pinResolver = null; if (r) r(null); });
  });
}

/* Hoja «Mi cuenta»: cambiar, PIN, copia, importar, borrar. */
function hojaCuenta() {
  const c = C.activa();
  if (!c) return;
  abrirHojaSimple(`
    <div class="cuenta-cab">${avatarHtml(c)}<div><div class="f-nom">${esc(c.nombre)}</div><div class="f-en">Cuenta en este teléfono</div></div></div>
    <div class="hoja-btns">
      <button class="btn" id="hc-cambiar">${icono('cambiar')} Cambiar cuenta</button>
      <button class="btn" id="hc-pin">${icono('candado')} ${c.pin ? 'Quitar PIN' : 'Poner PIN'}</button>
      <button class="btn" id="hc-copia">${icono('copiar')} Copia de mi cuenta</button>
      <button class="btn" id="hc-importar">${icono('mas')} Importar copia</button>
      <button class="btn btn-peligro" id="hc-borrar">${icono('borrar')} Borrar cuenta</button>
    </div>
    <div id="hc-zona"></div>`);
  $('#hc-cambiar').addEventListener('click', () => { cerrarHojaSimple(); C.salir(); actualizarAvatar(); pintarCuenta('entrar'); });
  $('#hc-pin').addEventListener('click', async () => {
    cerrarHojaSimple();
    if (c.pin) {
      const pin = await pedirPin({ titulo: 'Tu PIN actual', sub: 'Para quitarlo' });
      if (pin !== null && await C.validarPin(c, pin)) await C.fijarPin(c.id, null);
      ir('hoy');
    } else {
      const p1 = await pedirPin({ titulo: 'PIN nuevo', sub: '4 dígitos' });
      if (p1 === null) { ir('hoy'); return; }
      const p2 = await pedirPin({ titulo: 'Otra vez el PIN', sub: 'Para confirmar' });
      if (p2 !== null && p2 === p1) await C.fijarPin(c.id, p1);
      ir('hoy');
    }
    actualizarAvatar();
  });
  $('#hc-copia').addEventListener('click', () => {
    const z = $('#hc-zona');
    z.innerHTML = `<p class="cuenta-sub" style="margin-top:12px">Guárdala fuera del teléfono. Con ella recuperas tu cuenta si cambias de celular.</p>
    <textarea class="copia-txt" id="hc-txt" readonly>${esc(C.exportar(c.id))}</textarea>
    <button class="btn btn-coral" id="hc-copiar" style="width:100%;margin-top:8px">Copiar</button>`;
    $('#hc-copiar').addEventListener('click', async ev => {
      const t = $('#hc-txt');
      try { await navigator.clipboard.writeText(t.value); ev.target.textContent = 'Copiada'; }
      catch { t.select(); document.execCommand('copy'); ev.target.textContent = 'Copiada'; }
    });
  });
  $('#hc-importar').addEventListener('click', () => {
    const z = $('#hc-zona');
    z.innerHTML = `<div class="campo" style="margin-top:12px"><label>Nombre de la cuenta nueva</label><input type="text" id="hc-imp-nombre" maxlength="16" placeholder="Ej.: Alejo"></div>
    <textarea class="copia-txt" id="hc-imp-txt" placeholder="Pega aquí la copia"></textarea>
    <div class="error-form" id="hc-imp-error"></div>
    <button class="btn btn-coral" id="hc-imp-btn" style="width:100%;margin-top:8px">Importar</button>`;
    $('#hc-imp-btn').addEventListener('click', () => {
      const { error } = C.importar($('#hc-imp-txt').value, $('#hc-imp-nombre').value);
      if (error) { $('#hc-imp-error').textContent = error; return; }
      cerrarHojaSimple(); pintarCuenta('entrar');
    });
  });
  let armadoBorrar = false;
  $('#hc-borrar').addEventListener('click', ev => {
    if (!armadoBorrar) { armadoBorrar = true; ev.target.innerHTML = icono('borrar') + ' ¿Seguro? Se borra todo'; return; }
    cerrarHojaSimple();
    C.borrar(c.id);
    actualizarAvatar();
    pintarCuenta(C.lista().length ? 'entrar' : 'crear');
  });
}
