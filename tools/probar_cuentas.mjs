// Ironloop — pruebas de cuentas locales (diseño de Claude, sus 7 casos).
// Uso: node tools/probar_cuentas.mjs
// Shim de localStorage en memoria ANTES de importar los módulos.
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
  clear: () => store.clear(),
};
globalThis.window = globalThis;

const A = await import('../www/js/almacen.js');
const C = await import('../www/js/cuentas.js');

let fallos = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok ' : 'FALLO ') + msg); if (!cond) fallos++; };
const limpiar = () => { store.clear(); C.salir(); };

// 3) Sin cuenta activa, guardar no escribe nada y leer da el defecto.
limpiar();
ok(A.guardar('perfil', { nombre: 'X' }) === false, 'sin cuenta: guardar devuelve false');
ok(store.size === 0, 'sin cuenta: nada quedó escrito');
ok(A.perfil() === null, 'sin cuenta: perfil() es null');

// 1) Dos cuentas no ven los datos de la otra.
limpiar();
const a1 = C.crear('Ana').cuenta, a2 = C.crear('Beto').cuenta;
C.entrar(a1.id);
A.guardarPerfil({ nombre: 'Ana', edad: 25, peso_kg: 60, objetivo: 'fuerza', nivel: 'intermedio', equipo: [], zonas_lesionadas: [], dias: 3 });
A.registrarSesion({ ts: new Date().toISOString(), series: [{ ej: '0001' }], completada: true });
ok(A.perfil().nombre === 'Ana' && A.historial().length === 1, 'cuenta Ana guarda perfil e historial');
C.entrar(a2.id);
ok(A.perfil() === null && A.historial().length === 0, 'cuenta Beto NO ve datos de Ana');
C.entrar(a1.id);
ok(A.perfil().nombre === 'Ana', 'al volver, Ana recupera sus datos');

// 4) PIN: correcto entra, incorrecto no.
await C.fijarPin(a2.id, '1234');
const c2 = C.lista().find(x => x.id === a2.id);
ok(await C.validarPin(c2, '1234') === true, 'PIN correcto valida');
ok(await C.validarPin(c2, '9999') === false, 'PIN incorrecto no valida');

// 5) Borrar una cuenta no toca las claves de otra.
C.borrar(a2.id);
ok(C.lista().length === 1 && A.perfil()?.nombre === 'Ana', 'borrar Beto deja intacta a Ana');
ok(![...store.keys()].some(k => k.includes(a2.id)), 'sin claves residuales de Beto');

// 7) Nombre duplicado (otra capitalización) y tope de 5 cuentas.
limpiar();
C.crear('Luz');
ok(!!C.crear('luz').error, 'nombre duplicado con otra capitalización: rechazado');
ok(!!C.crear('L').error, 'nombre de 1 letra: rechazado');
for (const n of ['Sol', 'Mar', 'Rio', 'Leo']) C.crear(n);
ok(C.lista().length === 5 && !!C.crear('Seis').error, 'la sexta cuenta se rechaza');

// 2) Migración: datos viejos → cuenta, idéntica e idempotente.
limpiar();
const perfilViejo = { nombre: 'Viejo', edad: 30, peso_kg: 80, objetivo: 'hipertrofia', nivel: 'principiante', equipo: ['Peso corporal'], zonas_lesionadas: [], dias: 3, semilla: 42 };
localStorage.setItem('fit.perfil', JSON.stringify(perfilViejo));
localStorage.setItem('fit.historial', JSON.stringify([{ ts: '2026-11-01T10:00:00.000Z', series: [] }]));
ok(C.hayDatosViejos(), 'detecta datos de la versión sin cuentas');
const mig = C.migrar('Yo');
ok(!!mig.cuenta, 'migración crea la cuenta');
ok(A.perfil()?.nombre === 'Viejo' && A.historial().length === 1, 'los datos migrados son los mismos');
ok(localStorage.getItem('fit.perfil') === null, 'las claves viejas se borraron tras verificar');
ok(!!C.migrar('Otro').error && C.lista().length === 1, 'segunda migración no duplica');

// 6) fit.cuentas corrupto con claves fit.c.* presentes: se repara.
limpiar();
const a3 = C.crear('Rota').cuenta;
C.entrar(a3.id);
A.guardarPerfil({ nombre: 'Rota', edad: 22, peso_kg: 55, objetivo: 'salud', nivel: 'principiante', equipo: [], zonas_lesionadas: [], dias: 2 });
localStorage.setItem('fit.cuentas', '{roto');
const reparada = C.leerCuentas();
ok(reparada.lista.length === 1 && reparada.lista[0].id === a3.id, 'lista reparada desde las claves existentes');
ok(A.perfil()?.nombre === 'Rota', 'los datos sobreviven a la reparación');

// Copia / importar: la cuenta renace en otra lista sin el PIN.
limpiar();
const e1 = C.crear('Expo').cuenta;
C.entrar(e1.id);
A.guardarPerfil({ nombre: 'Expo', edad: 28, peso_kg: 70, objetivo: 'fuerza', nivel: 'avanzado', equipo: [], zonas_lesionadas: [], dias: 4 });
await C.fijarPin(e1.id, '0000');
const copia = C.exportar(e1.id);
limpiar();
const imp = C.importar(copia, 'Expo');
ok(!!imp.cuenta && imp.cuenta.pin === null, 'importar crea la cuenta sin PIN');
C.entrar(imp.cuenta.id);
ok(A.perfil()?.nombre === 'Expo', 'la copia restaura el perfil');

console.log(fallos ? `\n${fallos} FALLOS` : '\nPRUEBAS DE CUENTAS COMPLETAS ✓');
process.exit(fallos ? 1 : 0);
