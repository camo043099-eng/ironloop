// Ironloop — cuentas personales 100 % locales (diseño de Claude).
// Sin servidor: la cuenta vive en este teléfono. Solo pide un nombre
// (2-16 caracteres, único) y un PIN opcional de 4 dígitos, que es un
// candado de privacidad (hash con sal), NO cifrado ni contraseña real.
// Los datos de cada cuenta viven bajo fit.c.<id>.* y almacen.js solo
// escribe ahí cuando esa cuenta está activa.
import { activarCuenta } from './almacen.js';

const K_CUENTAS = 'fit.cuentas';
const K_ACTIVA = 'fit.cuenta_activa';
const K_MIGRADO = 'fit.migrado';
const CLAVES_CUENTA = ['perfil', 'rutina', 'historial', 'favoritos', 'ajustes', 'sesion_activa'];
const MAX_CUENTAS = 5;
export const COLORES = ['#FF6B3D', '#35D5C3', '#B6F24A', '#9C8CFF', '#FFC247'];

const crudo = (k, defecto = null) => {
  try { const v = localStorage.getItem(k); return v === null ? defecto : JSON.parse(v); }
  catch { return defecto; }
};
const ponerCrudo = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const nuevoId = () => {
  const a = new Uint8Array(6);
  (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.floor(Math.random() * 256));
  return [...a].map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 8);
};
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));

// Reparación: si fit.cuentas se corrompe pero existen claves fit.c.*,
// se reconstruye la lista con esos ids (nombre «Cuenta», sin PIN).
function reparar() {
  const ids = new Set();
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || '';
    const m = k.match(/^fit\.c\.([a-z0-9]+)\./);
    if (m) ids.add(m[1]);
  }
  if (!ids.size) return { v: 1, lista: [] };
  const lista = [...ids].map((id, i) => ({ id, nombre: 'Cuenta', creada: Date.now(), color: i % COLORES.length, pin: null }));
  const datos = { v: 1, lista };
  ponerCrudo(K_CUENTAS, datos);
  return datos;
}

export function leerCuentas() {
  let bruto = null;
  try { bruto = localStorage.getItem(K_CUENTAS); } catch { /* sin almacenamiento */ }
  if (bruto === null) return { v: 1, lista: [] };
  try {
    const d = JSON.parse(bruto);
    if (d && Array.isArray(d.lista)) return d;
  } catch { /* corrupto: se repara abajo */ }
  return reparar();
}
function guardarCuentas(d) { ponerCrudo(K_CUENTAS, d); }
export function lista() { return leerCuentas().lista; }
export function activaId() { return crudo(K_ACTIVA, null); }
export function activa() { const id = activaId(); return lista().find(c => c.id === id) || null; }

export function entrar(id) {
  if (!lista().some(c => c.id === id)) return false;
  ponerCrudo(K_ACTIVA, id);
  activarCuenta(id);
  return true;
}
export function salir() { try { localStorage.removeItem(K_ACTIVA); } catch { } activarCuenta(null); }

export function nombreValido(nombre, datos = leerCuentas()) {
  const n = (nombre || '').trim();
  if (n.length < 2 || n.length > 16) return 'Nombre de 2 a 16 letras.';
  if (datos.lista.some(c => c.nombre.toLowerCase() === n.toLowerCase())) return 'Ese nombre ya existe.';
  if (datos.lista.length >= MAX_CUENTAS) return 'Máximo 5 cuentas en este teléfono.';
  return null;
}

async function hashPin(pin, salB64) {
  const sal = Uint8Array.from(atob(salB64), c => c.charCodeAt(0));
  const datos = new TextEncoder().encode(pin);
  const mezcla = new Uint8Array([...sal, ...datos]);
  if (crypto?.subtle) {
    return b64(await crypto.subtle.digest('SHA-256', mezcla));
  }
  // Sin crypto.subtle (WebView viejo): ofuscación simple. Es un candado
  // de privacidad local, no una credencial real; se documenta como tal.
  let h = 5381;
  for (const b of mezcla) h = ((h * 33) ^ b) >>> 0;
  return 'fnv:' + h.toString(36) + mezcla.length;
}
const nuevaSal = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return b64(a); };
export async function crearPin(pin) {
  const sal = nuevaSal();
  return { sal, hash: await hashPin(pin, sal) };
}
export async function validarPin(cuenta, pin) {
  if (!cuenta?.pin) return true;
  return (await hashPin(pin, cuenta.pin.sal)) === cuenta.pin.hash;
}

export function crear(nombre) {
  const datos = leerCuentas();
  const err = nombreValido(nombre, datos);
  if (err) return { error: err };
  const cuenta = { id: nuevoId(), nombre: nombre.trim(), creada: Date.now(), color: datos.lista.length % COLORES.length, pin: null };
  datos.lista.push(cuenta);
  guardarCuentas(datos);
  return { cuenta };
}
export async function fijarPin(id, pin) {
  const datos = leerCuentas();
  const c = datos.lista.find(x => x.id === id);
  if (!c) return false;
  c.pin = pin ? await crearPin(pin) : null;
  guardarCuentas(datos);
  return true;
}
export function borrar(id) {
  const datos = leerCuentas();
  datos.lista = datos.lista.filter(c => c.id !== id);
  guardarCuentas(datos);
  const prefijo = `fit.c.${id}.`;
  const claves = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefijo)) claves.push(k); }
  for (const k of claves) localStorage.removeItem(k);
  if (activaId() === id) salir();
}

/* ---------- Migración del perfil suelto (versiones sin cuentas) ---------- */
export function hayDatosViejos() {
  return CLAVES_CUENTA.some(k => localStorage.getItem('fit.' + k) !== null);
}
// Crea la cuenta y copia las claves viejas verificando cada copia.
// Solo si TODAS coinciden borra las viejas; si algo falla, no borra
// nada y la app sigue con los datos viejos (idempotente).
export function migrar(nombre) {
  if (crudo(K_MIGRADO) === 1 || lista().length) return { error: 'Ya hay cuentas.' };
  const { cuenta, error } = crear(nombre);
  if (error) return { error };
  const prefijo = `fit.c.${cuenta.id}.`;
  for (const k of CLAVES_CUENTA) {
    const v = localStorage.getItem('fit.' + k);
    if (v === null) continue;
    try { localStorage.setItem(prefijo + k, v); } catch { return { error: 'Sin espacio para migrar.' }; }
    if (localStorage.getItem(prefijo + k) !== v) return { error: 'No se pudo verificar la copia.' };
  }
  for (const k of CLAVES_CUENTA) localStorage.removeItem('fit.' + k);
  ponerCrudo(K_MIGRADO, 1);
  entrar(cuenta.id);
  return { cuenta };
}

/* ---------- Copia / importar (cambio de teléfono, sin servidor) ---------- */
export function exportar(id) {
  const salida = { app: 'ironloop', v: 1, datos: {} };
  for (const k of CLAVES_CUENTA) {
    const v = localStorage.getItem(`fit.c.${id}.${k}`);
    if (v !== null) salida.datos[k] = JSON.parse(v);
  }
  return JSON.stringify(salida);
}
export function importar(texto, nombre) {
  let parsed;
  try { parsed = JSON.parse(texto); } catch { return { error: 'Esa copia no es válida.' }; }
  if (!parsed || parsed.app !== 'ironloop' || typeof parsed.datos !== 'object') return { error: 'Esa copia no es de Ironloop.' };
  const { cuenta, error } = crear(nombre);
  if (error) return { error };
  for (const k of CLAVES_CUENTA) {
    if (parsed.datos[k] !== undefined) ponerCrudo(`fit.c.${cuenta.id}.${k}`, parsed.datos[k]);
  }
  return { cuenta };
}
