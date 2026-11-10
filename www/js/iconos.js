// Ironloop — registro cerrado de iconos vectoriales (regla de Carlos:
// SOLO SVG en la paleta de la app, nada de emojis en la interfaz).
// Trazo currentColor: el color lo pone el contexto con CSS.
const trazo = inner => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ICONOS = {
  // Guía por rutina (registro de guia.json)
  plato: trazo('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>'),
  agua: trazo('<path d="M12 3.5c3.2 3.9 5.5 7.2 5.5 10.3a5.5 5.5 0 1 1-11 0C6.5 10.7 8.8 7.4 12 3.5z"/>'),
  fruta: trazo('<path d="M12 8.5c1-2 3-3 5-2.8-.3 2-1.8 3.6-4 3.8"/><path d="M12 8.5c-4.5-2-9 1.2-9 5.7 0 4 3 7.3 6 7.3 1 0 1.8-.4 3-.4s2 .4 3 .4c3 0 6-3.3 6-7.3 0-4.5-4.5-7.7-9-5.7z"/>'),
  proteina: trazo('<path d="M12 3.5c2.9 0 5.3 4.4 5.3 9.3a5.3 5.3 0 1 1-10.6 0C6.7 7.9 9.1 3.5 12 3.5z"/><circle cx="12" cy="14" r="2.3"/>'),
  sueno: trazo('<path d="M20 13.6A8.2 8.2 0 1 1 10.4 4a6.6 6.6 0 0 0 9.6 9.6z"/>'),
  caminar: trazo('<ellipse cx="8.6" cy="7.6" rx="2.7" ry="3.8" transform="rotate(-14 8.6 7.6)"/><ellipse cx="15.4" cy="16.4" rx="2.7" ry="3.8" transform="rotate(-14 15.4 16.4)"/>'),
  estirar: trazo('<path d="M9 4H4v5M15 20h5v-5M4 4l6 6M20 20l-6-6"/>'),
  reloj: trazo('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  // Cuenta e interfaz
  info: trazo('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r="0.6" fill="currentColor"/>'),
  candado: trazo('<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
  gimnasio: trazo('<path d="M6.8 6.8v10.4M3.8 9.2v5.6M17.2 6.8v10.4M20.2 9.2v5.6M6.8 12h10.4"/>'),
  casa: trazo('<path d="M4 11l8-7 8 7"/><path d="M6.2 9.3V20h11.6V9.3"/><path d="M10 20v-5h4v5"/>'),
  mano: trazo('<path d="M4 8h9M19 8h1M4 16h3M13 16h7"/><circle cx="16" cy="8" r="2.2"/><circle cx="10" cy="16" r="2.2"/>'),
  copiar: trazo('<rect x="9" y="9" width="11.5" height="11.5" rx="2"/><path d="M5.5 15h-1A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v1"/>'),
  cambiar: trazo('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M18.5 3.5v4h-4"/>'),
  borrar: trazo('<path d="M4 7h16M9.5 7V4h5v3M6.5 7l.9 13h9.2l.9-13M10 11v5.5M14 11v5.5"/>'),
  mas: trazo('<path d="M12 5v14M5 12h14"/>'),
  volver: trazo('<path d="M14.5 5.5L8 12l6.5 6.5"/>'),
  estrella: trazo('<path d="M12 3.6l2.5 5.2 5.7.7-4.2 4 1.1 5.6L12 16.4l-5.1 2.7L8 13.5l-4.2-4 5.7-.7z"/>'),
  cerrar: trazo('<path d="M6 6l12 12M18 6L6 18"/>'),
};

export function icono(nombre, clase = 'ic') {
  const svg = ICONOS[nombre] || ICONOS.info;
  return svg.replace('<svg', `<svg class="${clase}"`);
}
