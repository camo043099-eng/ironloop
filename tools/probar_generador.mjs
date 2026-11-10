// Pruebas de propiedades del generador (Node, sin dependencias).
import { readFileSync } from 'node:fs';
import { generarRutina, excluidoPorLesion, derivarFlags } from '../www/js/generador.js';

const leer = n => JSON.parse(readFileSync(new URL('../www/data/' + n, import.meta.url)));
const ejercicios = leer('ejercicios.json');
const tablas = { prescripcion: leer('prescripcion.json'), grupos: leer('grupos.json'), lesiones: leer('lesiones.json') };
const porId = new Map(ejercicios.map(e => [e.id, e]));

const EQUIPOS = {
  'solo corporal': ['Peso corporal'],
  'casa': ['Peso corporal', 'Mancuernas', 'Banda', 'Banda de resistencia'],
  'gym completo': [...new Set(ejercicios.map(e => e.e))],
};
const LESIONES = [[], ['hombro'], ['rodilla'], ['espalda_baja'], ['hombro', 'rodilla'], ['muneca'], ['codo']];
let casos = 0, fallos = 0, vacios = 0;
const t0 = Date.now();

for (const dias of [2, 3, 4, 5])
  for (const nivel of ['principiante', 'intermedio', 'avanzado'])
    for (const objetivo of ['fuerza', 'hipertrofia', 'perdida_grasa', 'salud'])
      for (const [eqNombre, equipo] of Object.entries(EQUIPOS))
        for (const zonas of LESIONES)
          for (const edad of [24, 52, 67]) {
            const perfil = { edad, peso_kg: 72, nivel, objetivo, equipo, dias, zonas_lesionadas: zonas };
            const r = generarRutina(perfil, ejercicios, tablas, 1234);
            casos++;
            const ids = [];
            for (const s of r.semana) {
              if (!s) continue;
              if (!s.bloques.length) vacios++;
              for (const b of s.bloques) {
                ids.push(b.ej);
                const ej = porId.get(b.ej);
                if (!ej) { console.log('FALLO id inexistente', b.ej); fallos++; continue; }
                if (![...equipo, 'Peso corporal'].includes(ej.e)) { console.log('FALLO equipo', eqNombre, ej.e); fallos++; }
                const z = excluidoPorLesion(ej, zonas, tablas.lesiones);
                if (z) { console.log('FALLO lesión: entró un excluido por', z, '-', ej.ne); fallos++; }
              }
            }
            if (new Set(ids).size !== ids.length) { console.log('FALLO repetido en la semana', dias, nivel, objetivo, eqNombre, zonas); fallos++; }
            // Determinismo (sin la marca de tiempo `generada`, que varia por llamada)
            const r2 = generarRutina(perfil, ejercicios, tablas, 1234);
            if (JSON.stringify(r.semana) !== JSON.stringify(r2.semana) ||
                JSON.stringify(r.advertencias) !== JSON.stringify(r2.advertencias)) { console.log('FALLO determinismo'); fallos++; }
          }

const ms = (Date.now() - t0) / casos;
console.log(`casos: ${casos} | fallos: ${fallos} | sesiones vacías: ${vacios} | ${ms.toFixed(2)} ms/caso`);
if (fallos) process.exit(1);
console.log('TODAS LAS PROPIEDADES OK ✓');
