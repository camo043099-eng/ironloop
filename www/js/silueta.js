// Ironloop — siluetas SVG propias (frontal del prototipo aprobado + dorsal nueva).
// Cada músculo lleva data-m con el nombre del músculo objetivo del dataset.
const BASE = '#242D3E';
export const CALORES = ['#242D3E', '#8C4326', '#C65328', '#FF6B3D'];

export const MUSCULOS_VISTA = {
  frontal: ['Pectorales', 'Deltoides', 'Bíceps', 'Antebrazos', 'Abdominales', 'Cuádriceps', 'Aductores', 'Pantorrillas', 'Trapecios'],
  dorsal: ['Trapecios', 'Deltoides', 'Tríceps', 'Antebrazos', 'Dorsales', 'Espalda alta', 'Columna', 'Glúteos', 'Isquiotibiales', 'Pantorrillas'],
};

export function svgFrontal() {
  return `<svg viewBox="0 0 200 340" width="100%" aria-label="Cuerpo de frente">
  <circle cx="100" cy="26" r="17" fill="${BASE}"/>
  <path data-m="Trapecios" d="M78 48 L122 48 L132 66 L68 66 Z" fill="${BASE}"/>
  <ellipse data-m="Deltoides" cx="58" cy="76" rx="15" ry="19" fill="${BASE}"/>
  <ellipse data-m="Deltoides" cx="142" cy="76" rx="15" ry="19" fill="${BASE}"/>
  <path data-m="Pectorales" d="M70 62 Q100 52 130 62 L128 96 Q100 106 72 96 Z" fill="${BASE}"/>
  <ellipse data-m="Bíceps" cx="50" cy="112" rx="10" ry="24" fill="${BASE}"/>
  <ellipse data-m="Bíceps" cx="150" cy="112" rx="10" ry="24" fill="${BASE}"/>
  <ellipse data-m="Antebrazos" cx="46" cy="156" rx="8" ry="20" fill="${BASE}"/>
  <ellipse data-m="Antebrazos" cx="154" cy="156" rx="8" ry="20" fill="${BASE}"/>
  <path data-m="Abdominales" d="M76 102 L124 102 L120 168 L80 168 Z" fill="${BASE}"/>
  <path data-m="Cuádriceps" d="M76 174 L97 174 L93 258 L73 258 Z" fill="${BASE}"/>
  <path data-m="Cuádriceps" d="M103 174 L124 174 L127 258 L107 258 Z" fill="${BASE}"/>
  <path data-m="Aductores" d="M97 178 L103 178 L101 240 L99 240 Z" fill="${BASE}"/>
  <ellipse data-m="Pantorrillas" cx="83" cy="288" rx="10" ry="24" fill="${BASE}"/>
  <ellipse data-m="Pantorrillas" cx="117" cy="288" rx="10" ry="24" fill="${BASE}"/>
</svg>`;
}

export function svgDorsal() {
  return `<svg viewBox="0 0 200 340" width="100%" aria-label="Cuerpo de espaldas">
  <circle cx="100" cy="26" r="17" fill="${BASE}"/>
  <path data-m="Trapecios" d="M72 46 L128 46 L116 108 L84 108 Z" fill="${BASE}"/>
  <ellipse data-m="Deltoides" cx="58" cy="76" rx="15" ry="19" fill="${BASE}"/>
  <ellipse data-m="Deltoides" cx="142" cy="76" rx="15" ry="19" fill="${BASE}"/>
  <path data-m="Dorsales" d="M74 96 L97 108 L94 158 L72 138 Z" fill="${BASE}"/>
  <path data-m="Dorsales" d="M126 96 L103 108 L106 158 L128 138 Z" fill="${BASE}"/>
  <path data-m="Espalda alta" d="M84 108 L116 108 L112 128 L88 128 Z" fill="${BASE}"/>
  <ellipse data-m="Tríceps" cx="50" cy="112" rx="10" ry="24" fill="${BASE}"/>
  <ellipse data-m="Tríceps" cx="150" cy="112" rx="10" ry="24" fill="${BASE}"/>
  <ellipse data-m="Antebrazos" cx="46" cy="156" rx="8" ry="20" fill="${BASE}"/>
  <ellipse data-m="Antebrazos" cx="154" cy="156" rx="8" ry="20" fill="${BASE}"/>
  <path data-m="Columna" d="M88 142 L112 142 L110 168 L90 168 Z" fill="${BASE}"/>
  <ellipse data-m="Glúteos" cx="86" cy="188" rx="14" ry="17" fill="${BASE}"/>
  <ellipse data-m="Glúteos" cx="114" cy="188" rx="14" ry="17" fill="${BASE}"/>
  <path data-m="Isquiotibiales" d="M74 208 L97 208 L93 258 L73 258 Z" fill="${BASE}"/>
  <path data-m="Isquiotibiales" d="M103 208 L126 208 L127 258 L107 258 Z" fill="${BASE}"/>
  <ellipse data-m="Pantorrillas" cx="83" cy="288" rx="10" ry="24" fill="${BASE}"/>
  <ellipse data-m="Pantorrillas" cx="117" cy="288" rx="10" ry="24" fill="${BASE}"/>
</svg>`;
}

// mapa: {musculo: series} → pinta cada [data-m] con el escalón de calor.
export function aplicarCalor(raiz, mapa) {
  raiz.querySelectorAll('[data-m]').forEach(p => {
    const v = mapa[p.dataset.m] || 0;
    const nivel = v === 0 ? 0 : v <= 4 ? 1 : v <= 9 ? 2 : 3;
    p.setAttribute('fill', CALORES[nivel]);
  });
}
