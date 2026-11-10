// Ironloop — almacenamiento local versionado (localStorage).
// Las lecturas validan la FORMA de lo guardado: un dato corrupto o de una
// versión rara nunca tumba una vista; se trata como si no existiera.
const PREFIJO = 'fit.';
export function leer(clave, defecto = null) {
  try {
    const v = localStorage.getItem(PREFIJO + clave);
    return v === null ? defecto : JSON.parse(v);
  } catch { return defecto; }
}
export function guardar(clave, valor) {
  try { localStorage.setItem(PREFIJO + clave, JSON.stringify(valor)); return true; }
  catch { return false; /* cuota llena o almacenamiento bloqueado */ }
}
const esObjeto = v => !!v && typeof v === 'object' && !Array.isArray(v);

export function perfil() {
  const p = leer('perfil');
  if (!esObjeto(p)) return null;
  if (!Number.isFinite(p.edad) || !Number.isFinite(p.peso_kg)) return null;
  if (typeof p.objetivo !== 'string' || typeof p.nivel !== 'string') return null;
  if (!Array.isArray(p.equipo) || !Array.isArray(p.zonas_lesionadas)) return null;
  return p;
}
export const guardarPerfil = p => guardar('perfil', p);
export function rutina() {
  const r = leer('rutina');
  return esObjeto(r) && Array.isArray(r.semana) ? r : null;
}
export const guardarRutina = r => guardar('rutina', r);
export function historial() {
  const h = leer('historial', []);
  return Array.isArray(h) ? h : [];
}
export function registrarSesion(registro) {
  const h = historial();
  h.push(registro);
  guardar('historial', h.slice(-400));
}
export function favoritos() {
  const f = leer('favoritos', []);
  return new Set(Array.isArray(f) ? f : []);
}
export function alternarFavorito(id) {
  const f = favoritos();
  if (f.has(id)) f.delete(id); else f.add(id);
  guardar('favoritos', [...f]);
  return f.has(id);
}
const AJUSTES_BASE = { voz: true, pitidos: true, vibracion: true };
export function ajustes() {
  const a = leer('ajustes', {});
  return { ...AJUSTES_BASE, ...(esObjeto(a) ? a : {}) };
}
export const guardarAjustes = a => guardar('ajustes', a);
// Sesión guiada en curso: se guarda en cada serie para poder continuarla
// si la app se cierra o Android la mata en segundo plano.
export function sesionActiva() {
  const s = leer('sesion_activa');
  return esObjeto(s) && Array.isArray(s.bloques) ? s : null;
}
export const guardarSesionActiva = s => guardar('sesion_activa', s);
export function borrarSesionActiva() {
  try { localStorage.removeItem(PREFIJO + 'sesion_activa'); } catch { /* sin almacenamiento */ }
}
