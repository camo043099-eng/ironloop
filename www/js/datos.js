// Ironloop — carga de datos e índices en memoria.
import { derivarFlags } from './generador.js';

export const D = {
  ejercicios: [], porId: new Map(), prescripcion: null, grupos: null,
  lesiones: null, voz: null, salud: null, guia: null, listo: false,
};

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// El dataset trae algunos músculos en inglés: se traducen al cargar para que
// las fichas, el buscador y el mapa de calor hablen siempre en español.
const TRAD_MUSCULOS = {
  'abdominals': 'Abdominales', 'deltoids': 'Deltoides', 'rear deltoids': 'Deltoides',
  'latissimus dorsi': 'Dorsales', 'rotator cuff': 'Manguito rotador', 'shins': 'Tibial anterior',
  'trapezius': 'Trapecios', 'upper chest': 'Pectorales',
  'wrist extensors': 'Antebrazos', 'wrist flexors': 'Antebrazos',
};
const tradMusculo = m => TRAD_MUSCULOS[(m || '').toLowerCase()] || m;

export async function cargarDatos() {
  const [ej, pr, gr, le, vo, sa, gu] = await Promise.all([
    fetch('data/ejercicios.json').then(r => r.json()),
    fetch('data/prescripcion.json').then(r => r.json()),
    fetch('data/grupos.json').then(r => r.json()),
    fetch('data/lesiones.json').then(r => r.json()),
    fetch('data/voz.json').then(r => r.json()),
    fetch('data/salud.json').then(r => r.json()),
    fetch('data/guia.json').then(r => r.json()),
  ]);
  D.ejercicios = ej; D.prescripcion = pr; D.grupos = gr; D.lesiones = le; D.voz = vo; D.salud = sa; D.guia = gu;
  for (const e of ej) {
    e.m = tradMusculo(e.m);
    if (Array.isArray(e.s)) e.s = [...new Set(e.s.map(tradMusculo))];
    e.flags = derivarFlags(e);
    e.buscar = norm(e.ne + ' ' + e.n + ' ' + e.o + ' ' + e.p + ' ' + e.e);
    D.porId.set(e.id, e);
  }
  D.listo = true;
  return D;
}

export function tablas() {
  return { prescripcion: D.prescripcion, grupos: D.grupos, lesiones: D.lesiones };
}
export function imgDe(id) { return 'media/img/' + id + '.jpg'; }
export function vidDe(id) { return 'media/vid/' + id + '.mp4'; }
