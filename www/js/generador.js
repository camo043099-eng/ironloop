// Ironloop — generador de rutinas (JS puro, sin DOM; testeable en Node)
// Diseño del trío: algoritmo de Claude, tablas de Gemini, verificación de Shorekeeper.

export function mulberry32(semilla) {
  let a = semilla >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RE_TIEMPO = /plancha|isométr|estático|contra la pared|posición de|sostén/i;
const RE_UNILATERAL = /a un brazo|a una pierna|unilateral|con un brazo|con una pierna|a un solo brazo/i;
const RE_IMPACTO = /salto|pliométr|brinco|burpee/i;

export function derivarFlags(ej) {
  return {
    por_tiempo: RE_TIEMPO.test(ej.ne),
    unilateral: RE_UNILATERAL.test(ej.ne),
    impacto: RE_IMPACTO.test(ej.ne),
    compuesto: (ej.s || []).length >= 2,
  };
}

// Una regla de lesiones.json coincide si TODOS sus campos coinciden (AND).
export function cumpleRegla(ej, regla) {
  if (regla.o && ej.o !== regla.o) return false;
  if (regla.o_in && !regla.o_in.includes(ej.o)) return false;
  if (regla.e && ej.e !== regla.e) return false;
  if (regla.e_in && !regla.e_in.includes(ej.e)) return false;
  if (regla.nombre_regex && !(new RegExp(regla.nombre_regex, 'i')).test(ej.ne)) return false;
  return true;
}

export function excluidoPorLesion(ej, zonas, lesiones) {
  for (const z of zonas || []) {
    const def = lesiones.zonas[z];
    if (!def) continue;
    for (const regla of def.excluir || []) if (cumpleRegla(ej, regla)) return z;
  }
  return null;
}

function ajusteEdad(prescripcion, edad) {
  for (const a of prescripcion.ajustes_edad) if (edad >= a.edad_min && edad <= a.edad_max) return a;
  return prescripcion.ajustes_edad[0];
}

function cargaInicial(ej, perfil, prescripcion) {
  const ne = ej.ne.toLowerCase();
  for (const c of prescripcion.cargas_iniciales) {
    if (new RegExp(c.patron, 'i').test(ne)) {
      const kg = Math.round(perfil.peso_kg * c.factores[perfil.nivel] * 2) / 2;
      const nota = (kg < prescripcion.peso_barra_kg && /barra/.test(ej.e.toLowerCase()))
        ? 'Empieza con mancuernas: el cálculo da menos que la barra (20 kg).' : '';
      return { kg, nota };
    }
  }
  return null;
}

function prescripcionDeBloque(e, slot, ctx) {
  const { roles, ajuste, prescripcion, perfil, banderas } = ctx;
  const f = banderas.get(e.id);
  const tabla = roles[slot.rol] || roles.accesorio;
  let series = Math.max(1, Math.round(tabla.series * ajuste.series_mult));
  if (slot.rol === 'principal') series = Math.max(2, series);
  const bloque = {
    ej: e.id, rol: slot.rol, grupo: slot.g, series,
    descanso_s: tabla.descanso_s + (ajuste.descanso_add_s || 0),
    unilateral: f.unilateral,
  };
  if (f.por_tiempo) bloque.tiempo_s = tabla.tiempo_s ? Math.round((tabla.tiempo_s[0] + tabla.tiempo_s[1]) / 2) : 40;
  else {
    bloque.reps = [...(tabla.reps || [8, 12])];
    if (ajuste.reps_min_prin && slot.rol === 'principal') bloque.reps[0] = Math.max(bloque.reps[0], ajuste.reps_min_prin);
    if (tabla.rir) bloque.rir = tabla.rir;
  }
  const carga = cargaInicial(e, perfil, prescripcion);
  if (carga) { bloque.kg_sugerido = carga.kg; if (carga.nota) bloque.nota = carga.nota; }
  return bloque;
}

// Para el botón «Cambiar»: otra opción válida del mismo grupo/rol, sin repetir ids dados.
export function elegirAlternativa(perfil, ejercicios, tablas, grupoKey, rol, excluirIds, semilla) {
  const { prescripcion, grupos, lesiones } = tablas;
  const rnd = mulberry32(semilla);
  const ajuste = ajusteEdad(prescripcion, perfil.edad || 28);
  const banderas = new Map(ejercicios.map(e => [e.id, derivarFlags(e)]));
  const equipoOk = new Set([...(perfil.equipo || []), 'Peso corporal']);
  const g = grupos[grupoKey];
  if (!g) return null;
  const candidatos = ejercicios.filter(e =>
    !excluirIds.includes(e.id) && equipoOk.has(e.e) &&
    !excluidoPorLesion(e, perfil.zonas_lesionadas, lesiones) &&
    !(ajuste.evitar_impacto && banderas.get(e.id).impacto) &&
    ((g.musculos || []).includes(e.o) || (g.partes || []).includes(e.p)));
  if (!candidatos.length) return null;
  const elegido = candidatos[Math.floor(rnd() * candidatos.length)];
  const roles = prescripcion.objetivos[perfil.objetivo].por_nivel[perfil.nivel];
  return prescripcionDeBloque(elegido, { g: grupoKey, rol }, { roles, ajuste, prescripcion, perfil, banderas });
}

export function generarRutina(perfil, ejercicios, tablas, semilla) {
  const { prescripcion, grupos, lesiones } = tablas;
  const rnd = mulberry32(semilla);
  const ajuste = ajusteEdad(prescripcion, perfil.edad || 28);
  const banderas = new Map(ejercicios.map(e => [e.id, derivarFlags(e)]));

  // Pool duro: equipo disponible (peso corporal siempre) y cero excluidos por lesión.
  const equipoOk = new Set([...(perfil.equipo || []), 'Peso corporal']);
  const pool = ejercicios.filter(e => {
    if (!equipoOk.has(e.e)) return false;
    if (excluidoPorLesion(e, perfil.zonas_lesionadas, lesiones)) return false;
    if (ajuste.evitar_impacto && banderas.get(e.id).impacto) return false;
    return true;
  });

  const division = prescripcion.divisiones[String(perfil.dias)] || prescripcion.divisiones['3'];
  const patron = prescripcion.semana_patron[String(perfil.dias)] || prescripcion.semana_patron['3'];
  const roles = prescripcion.objetivos[perfil.objetivo].por_nivel[perfil.nivel];
  const usados = new Set();
  const advertencias = [];
  const semana = patron.map(() => null);

  division.sesiones.forEach((sesionDef, i) => {
    const bloques = [];
    for (const slot of sesionDef.slots) {
      const g = grupos[slot.g];
      if (!g) continue;
      let candidatos = pool.filter(e => !usados.has(e.id) &&
        ((g.musculos || []).includes(e.o) || (g.partes || []).includes(e.p)));
      candidatos = candidatos
        .map(e => {
          const f = banderas.get(e.id);
          let score = rnd() * 0.9;
          if (slot.rol === 'principal' && f.compuesto) score += 2;
          if (slot.rol !== 'principal' && !f.compuesto) score += 1;
          if (slot.rol === 'principal' && (g.musculos || [])[0] === e.o) score += 0.5;
          return { e, score };
        })
        .sort((a, b) => b.score - a.score);
      const elegidos = candidatos.slice(0, slot.n);
      if (elegidos.length < slot.n)
        advertencias.push(`Sesión ${sesionDef.nombre}: faltaron ejercicios de ${g.nombre} con tu equipo y filtros de lesión.`);
      for (const { e } of elegidos) {
        usados.add(e.id);
        bloques.push(prescripcionDeBloque(e, slot, { roles, ajuste, prescripcion, perfil, banderas }));
      }
    }
    // Duración estimada: series × (40 s de trabajo + descanso) entre ejercicios.
    const seg = bloques.reduce((t, b) => t + b.series * (40 + b.descanso_s), 0);
    semana[patron[i]] = {
      sesion_id: sesionDef.id, nombre: sesionDef.nombre, bloques,
      duracion_est_min: Math.round(seg / 60),
    };
  });

  return {
    v: 2, semilla, generada: new Date().toISOString(),
    tablas_version: prescripcion.version, advertencias, semana,
  };
}
