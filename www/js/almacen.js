// Ironloop — almacenamiento local versionado (localStorage).
const PREFIJO = 'fit.';
export function leer(clave, defecto = null) {
  try {
    const v = localStorage.getItem(PREFIJO + clave);
    return v === null ? defecto : JSON.parse(v);
  } catch { return defecto; }
}
export function guardar(clave, valor) {
  try { localStorage.setItem(PREFIJO + clave, JSON.stringify(valor)); } catch { /* cuota llena: se ignora */ }
}
export const perfil = () => leer('perfil');
export const guardarPerfil = p => guardar('perfil', p);
export const rutina = () => leer('rutina');
export const guardarRutina = r => guardar('rutina', r);
export const historial = () => leer('historial', []);
export function registrarSesion(registro) {
  const h = historial();
  h.push(registro);
  guardar('historial', h.slice(-400));
}
export const favoritos = () => new Set(leer('favoritos', []));
export function alternarFavorito(id) {
  const f = favoritos();
  if (f.has(id)) f.delete(id); else f.add(id);
  guardar('favoritos', [...f]);
  return f.has(id);
}
export const ajustes = () => leer('ajustes', { voz: true, pitidos: true, vibracion: true });
export const guardarAjustes = a => guardar('ajustes', a);
