#!/usr/bin/env python3
# Paso 2: tablas declarativas de Ironloop (prescripcion/grupos/lesiones/voz/salud)
# Fuente: diseno-v2-gemini.md (ciencia) + revision Pro de Gemini + arquitectura de Claude.
import json, os

DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'www', 'data')
os.makedirs(DATA, exist_ok=True)

def dump(nombre, obj):
    with open(os.path.join(DATA, nombre), 'w') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    print(nombre, 'ok')

# ---------------- prescripcion.json (Gemini) ----------------
# series/reps/descanso del rol principal salen de la matriz de Gemini;
# el accesorio baja 1 serie y acorta el descanso; el core va por reps o tiempo.
def roles(prin, acce, core_series=3):
    return {
        'calentamiento': {'series': 1, 'reps': [8, 12], 'descanso_s': 30},
        'principal': prin,
        'accesorio': acce,
        'core': {'series': core_series, 'reps': [10, 20], 'tiempo_s': [20, 45], 'descanso_s': 45},
    }

prescripcion = {
    'version': '1.0.0', 'autor': 'gemini', 'revisado_por': 'shorekeeper',
    'objetivos': {
        'fuerza': {'nombre': 'Fuerza', 'por_nivel': {
            'principiante': roles({'series': 3, 'reps': [5, 6], 'descanso_s': 165, 'rir': [3, 3]}, {'series': 2, 'reps': [6, 8], 'descanso_s': 120, 'rir': [3, 3]}, 2),
            'intermedio': roles({'series': 4, 'reps': [4, 6], 'descanso_s': 210, 'rir': [2, 2]}, {'series': 3, 'reps': [6, 8], 'descanso_s': 150, 'rir': [2, 2]}, 2),
            'avanzado': roles({'series': 5, 'reps': [3, 5], 'descanso_s': 240, 'rir': [1, 2]}, {'series': 3, 'reps': [5, 8], 'descanso_s': 180, 'rir': [1, 2]}, 3)}},
        'hipertrofia': {'nombre': 'Ganar músculo', 'por_nivel': {
            'principiante': roles({'series': 3, 'reps': [8, 12], 'descanso_s': 105, 'rir': [2, 3]}, {'series': 2, 'reps': [10, 15], 'descanso_s': 75, 'rir': [2, 3]}, 2),
            'intermedio': roles({'series': 4, 'reps': [8, 12], 'descanso_s': 105, 'rir': [2, 2]}, {'series': 3, 'reps': [10, 15], 'descanso_s': 75, 'rir': [2, 2]}, 3),
            'avanzado': roles({'series': 4, 'reps': [6, 12], 'descanso_s': 120, 'rir': [1, 1]}, {'series': 3, 'reps': [10, 15], 'descanso_s': 90, 'rir': [1, 1]}, 3)}},
        'perdida_grasa': {'nombre': 'Perder grasa', 'por_nivel': {
            'principiante': roles({'series': 3, 'reps': [12, 15], 'descanso_s': 68, 'rir': [3, 3]}, {'series': 2, 'reps': [12, 15], 'descanso_s': 60, 'rir': [3, 3]}, 2),
            'intermedio': roles({'series': 3, 'reps': [12, 15], 'descanso_s': 52, 'rir': [2, 3]}, {'series': 3, 'reps': [12, 18], 'descanso_s': 45, 'rir': [2, 3]}, 3),
            'avanzado': roles({'series': 4, 'reps': [12, 20], 'descanso_s': 52, 'rir': [2, 2]}, {'series': 3, 'reps': [15, 20], 'descanso_s': 45, 'rir': [2, 2]}, 3)}},
        'salud': {'nombre': 'Salud general', 'por_nivel': {
            'principiante': roles({'series': 2, 'reps': [10, 12], 'descanso_s': 90, 'rir': [3, 4]}, {'series': 2, 'reps': [10, 12], 'descanso_s': 75, 'rir': [3, 4]}, 2),
            'intermedio': roles({'series': 3, 'reps': [10, 15], 'descanso_s': 75, 'rir': [3, 3]}, {'series': 2, 'reps': [10, 15], 'descanso_s': 60, 'rir': [3, 3]}, 2),
            'avanzado': roles({'series': 3, 'reps': [10, 15], 'descanso_s': 60, 'rir': [2, 3]}, {'series': 3, 'reps': [12, 15], 'descanso_s': 60, 'rir': [2, 3]}, 3)}},
    },
    'ajustes_edad': [
        {'id': 'e18', 'edad_min': 0, 'edad_max': 29, 'series_mult': 1.0, 'descanso_add_s': 0, 'evitar_impacto': False},
        {'id': 'e30', 'edad_min': 30, 'edad_max': 44, 'series_mult': 0.95, 'descanso_add_s': 15, 'evitar_impacto': False},
        {'id': 'e45', 'edad_min': 45, 'edad_max': 59, 'series_mult': 0.8, 'descanso_add_s': 30, 'evitar_impacto': False, 'reps_min_prin': 6},
        {'id': 'e60', 'edad_min': 60, 'edad_max': 120, 'series_mult': 0.7, 'descanso_add_s': 52, 'evitar_impacto': True, 'reps_min_prin': 8},
    ],
    'cargas_iniciales': [
        {'patron': 'sentadilla', 'factores': {'principiante': 0.35, 'intermedio': 0.65, 'avanzado': 0.90}},
        {'patron': 'press de banca', 'factores': {'principiante': 0.30, 'intermedio': 0.55, 'avanzado': 0.75}},
        {'patron': 'peso muerto', 'factores': {'principiante': 0.45, 'intermedio': 0.80, 'avanzado': 1.10}},
        {'patron': 'remo', 'factores': {'principiante': 0.25, 'intermedio': 0.45, 'avanzado': 0.65}},
        {'patron': 'press de hombro|press militar|press sobre la cabeza', 'factores': {'principiante': 0.20, 'intermedio': 0.35, 'avanzado': 0.50}},
    ],
    'peso_barra_kg': 20,
    'progresion': {'tren_superior_kg': [1, 2], 'tren_inferior_kg': [2.5, 5],
                   'regla': 'Si completas todas las series en el tope del rango de repeticiones con buena técnica, sube la carga en la próxima sesión.'},
    'semana_patron': {'2': [0, 3], '3': [0, 2, 4], '4': [0, 1, 3, 4], '5': [0, 1, 2, 4, 5], '6': [0, 1, 2, 3, 4, 5]},
    'divisiones': {
        '2': {'nombre': 'Cuerpo completo A/B', 'sesiones': [
            {'id': 'A', 'nombre': 'Cuerpo completo A', 'slots': [
                {'g': 'pierna', 'rol': 'principal', 'n': 1}, {'g': 'pecho', 'rol': 'principal', 'n': 1},
                {'g': 'espalda', 'rol': 'principal', 'n': 1}, {'g': 'core', 'rol': 'core', 'n': 1}]},
            {'id': 'B', 'nombre': 'Cuerpo completo B', 'slots': [
                {'g': 'gluteos', 'rol': 'principal', 'n': 1}, {'g': 'hombro', 'rol': 'principal', 'n': 1},
                {'g': 'biceps', 'rol': 'accesorio', 'n': 1}, {'g': 'triceps', 'rol': 'accesorio', 'n': 1},
                {'g': 'pantorrillas', 'rol': 'accesorio', 'n': 1}]}]},
        '3': {'nombre': 'Empuje / Tracción / Piernas', 'sesiones': [
            {'id': 'E', 'nombre': 'Empuje', 'slots': [
                {'g': 'pecho', 'rol': 'principal', 'n': 1}, {'g': 'pecho', 'rol': 'accesorio', 'n': 1},
                {'g': 'hombro', 'rol': 'accesorio', 'n': 1}, {'g': 'triceps', 'rol': 'accesorio', 'n': 1}]},
            {'id': 'T', 'nombre': 'Tracción', 'slots': [
                {'g': 'espalda', 'rol': 'principal', 'n': 1}, {'g': 'espalda_alta', 'rol': 'accesorio', 'n': 1},
                {'g': 'biceps', 'rol': 'accesorio', 'n': 1}, {'g': 'antebrazos', 'rol': 'accesorio', 'n': 1}]},
            {'id': 'P', 'nombre': 'Piernas y core', 'slots': [
                {'g': 'pierna', 'rol': 'principal', 'n': 1}, {'g': 'gluteos', 'rol': 'accesorio', 'n': 1},
                {'g': 'pantorrillas', 'rol': 'accesorio', 'n': 1}, {'g': 'core', 'rol': 'core', 'n': 1}]}]},
        '4': {'nombre': 'Torso / Pierna ×2', 'sesiones': [
            {'id': 'TA', 'nombre': 'Torso A', 'slots': [
                {'g': 'pecho', 'rol': 'principal', 'n': 1}, {'g': 'espalda', 'rol': 'principal', 'n': 1},
                {'g': 'triceps', 'rol': 'accesorio', 'n': 1}, {'g': 'biceps', 'rol': 'accesorio', 'n': 1}]},
            {'id': 'PA', 'nombre': 'Pierna A', 'slots': [
                {'g': 'pierna', 'rol': 'principal', 'n': 1}, {'g': 'pantorrillas', 'rol': 'accesorio', 'n': 1},
                {'g': 'core', 'rol': 'core', 'n': 1}]},
            {'id': 'TB', 'nombre': 'Torso B', 'slots': [
                {'g': 'hombro', 'rol': 'principal', 'n': 1}, {'g': 'espalda_alta', 'rol': 'accesorio', 'n': 1},
                {'g': 'pecho', 'rol': 'accesorio', 'n': 1}, {'g': 'biceps', 'rol': 'accesorio', 'n': 1}]},
            {'id': 'PB', 'nombre': 'Pierna B', 'slots': [
                {'g': 'gluteos', 'rol': 'principal', 'n': 1}, {'g': 'isquios', 'rol': 'accesorio', 'n': 1},
                {'g': 'pantorrillas', 'rol': 'accesorio', 'n': 1}, {'g': 'core', 'rol': 'core', 'n': 1}]}]},
        '5': {'nombre': 'Especialización', 'sesiones': [
            {'id': 'D1', 'nombre': 'Pecho y core', 'slots': [
                {'g': 'pecho', 'rol': 'principal', 'n': 1}, {'g': 'pecho', 'rol': 'accesorio', 'n': 1},
                {'g': 'triceps', 'rol': 'accesorio', 'n': 1}, {'g': 'core', 'rol': 'core', 'n': 1}]},
            {'id': 'D2', 'nombre': 'Espalda y pantorrillas', 'slots': [
                {'g': 'espalda', 'rol': 'principal', 'n': 1}, {'g': 'espalda_alta', 'rol': 'accesorio', 'n': 1},
                {'g': 'pantorrillas', 'rol': 'accesorio', 'n': 1}]},
            {'id': 'D3', 'nombre': 'Piernas', 'slots': [
                {'g': 'pierna', 'rol': 'principal', 'n': 1}, {'g': 'gluteos', 'rol': 'accesorio', 'n': 1},
                {'g': 'isquios', 'rol': 'accesorio', 'n': 1}, {'g': 'pantorrillas', 'rol': 'accesorio', 'n': 1}]},
            {'id': 'D4', 'nombre': 'Hombros', 'slots': [
                {'g': 'hombro', 'rol': 'principal', 'n': 1}, {'g': 'hombro', 'rol': 'accesorio', 'n': 1},
                {'g': 'espalda_alta', 'rol': 'accesorio', 'n': 1}]},
            {'id': 'D5', 'nombre': 'Brazos y core', 'slots': [
                {'g': 'biceps', 'rol': 'principal', 'n': 1}, {'g': 'triceps', 'rol': 'principal', 'n': 1},
                {'g': 'antebrazos', 'rol': 'accesorio', 'n': 1}, {'g': 'core', 'rol': 'core', 'n': 1}]}]},
    },
}
dump('prescripcion.json', prescripcion)

# ---------------- grupos.json ----------------
grupos = {
    'pecho': {'nombre': 'Pecho', 'musculos': ['Pectorales']},
    'espalda': {'nombre': 'Espalda', 'musculos': ['Dorsales']},
    'espalda_alta': {'nombre': 'Espalda alta', 'musculos': ['Espalda alta', 'Trapecios']},
    'hombro': {'nombre': 'Hombros', 'musculos': ['Deltoides']},
    'biceps': {'nombre': 'Bíceps', 'musculos': ['Bíceps']},
    'triceps': {'nombre': 'Tríceps', 'musculos': ['Tríceps']},
    'antebrazos': {'nombre': 'Antebrazos', 'musculos': ['Antebrazos']},
    'pierna': {'nombre': 'Piernas', 'musculos': ['Cuádriceps', 'Glúteos', 'Isquiotibiales', 'Aductores', 'Abductores'], 'partes': ['Piernas']},
    'gluteos': {'nombre': 'Glúteos', 'musculos': ['Glúteos']},
    'isquios': {'nombre': 'Isquiotibiales', 'musculos': ['Isquiotibiales']},
    'pantorrillas': {'nombre': 'Pantorrillas', 'musculos': ['Pantorrillas'], 'partes': ['Pantorrillas']},
    'core': {'nombre': 'Core', 'musculos': ['Abdominales'], 'partes': ['Cintura']},
    'cardio': {'nombre': 'Cardio', 'musculos': ['Sistema cardiovascular'], 'partes': ['Cardio']},
}
dump('grupos.json', grupos)

# ---------------- lesiones.json (consolidado por Shorekeeper) ----------------
# DSL: excluir = lista de reglas (OR); cada regla combina campos con AND.
# Campos: o (musculo objetivo), o_in, e (equipo), e_in, nombre_regex (sobre el nombre ES).
lesiones = {
    'version': '1.0.0',
    'zonas': {
        'hombro': {'etiqueta': 'Hombro', 'excluir': [
            {'o': 'Deltoides', 'nombre_regex': 'tras nuca|press militar|arnold|fondos|detrás de la nuca'},
            {'nombre_regex': 'tras nuca|detrás de la nuca|press tras nuca'}],
            'preferir_equipo': ['Polea', 'Banda', 'Banda de resistencia']},
        'rodilla': {'etiqueta': 'Rodilla', 'excluir': [
            {'nombre_regex': 'salto|pliométr|pistola|sissy|zancada con salto|estocada con salto'},
            {'o': 'Cuádriceps', 'e': 'Peso corporal', 'nombre_regex': 'sentadilla (con salto|búlgara profunda)'}],
            'preferir_equipo': ['Máquina de palanca', 'Máquina Smith', 'Polea']},
        'espalda_baja': {'etiqueta': 'Espalda baja', 'excluir': [
            {'nombre_regex': 'buenos días|hiperextensión sin soporte'},
            {'nombre_regex': 'peso muerto', 'e_in': ['Barra', 'Barra olímpica', 'Barra hexagonal', 'Mancuernas']},
            {'o': 'Columna', 'e_in': ['Barra', 'Barra olímpica', 'Mancuernas', 'Peso corporal']}],
            'preferir_equipo': ['Máquina de palanca', 'Máquina Smith', 'Trineo', 'Polea']},
        'codo': {'etiqueta': 'Codo', 'excluir': [
            {'o': 'Tríceps', 'nombre_regex': 'press francés|copa|rompecráneo|skull'},
            {'nombre_regex': 'predicador', 'e_in': ['Barra', 'Barra olímpica']}],
            'preferir_equipo': ['Polea', 'Mancuernas']},
        'muneca': {'etiqueta': 'Muñeca', 'excluir': [
            {'nombre_regex': 'curl de muñeca|de muñeca|flexión de muñeca|extensión de muñeca'},
            {'o_in': ['Antebrazos', 'Bíceps'], 'e_in': ['Barra', 'Barra olímpica']}],
            'preferir_equipo': ['Barra Z', 'Mancuernas', 'Polea']},
        'cadera': {'etiqueta': 'Cadera', 'excluir': [
            {'nombre_regex': 'sentadilla profunda|pistola|sumo profundo'}],
            'preferir_equipo': ['Máquina de palanca', 'Máquina Smith']},
        'tobillo': {'etiqueta': 'Tobillo', 'excluir': [
            {'nombre_regex': 'salto|pliométr|brinco'}],
            'preferir_equipo': ['Máquina de palanca', 'Polea']},
        'cuello': {'etiqueta': 'Cuello', 'excluir': [
            {'o': 'Deltoides', 'nombre_regex': 'encogimiento|shrug'}],
            'preferir_equipo': []},
    },
}
dump('lesiones.json', lesiones)

# ---------------- voz.json ----------------
voz = {
    'idioma': 'es-ES',
    'preparate': 'Prepárate. {ejercicio}, serie {n} de {total}.',
    'trabajo_reps': 'Adelante. {reps} repeticiones.',
    'trabajo_tiempo': 'Mantén la posición, {seg} segundos.',
    'descanso': 'Descansa {seg} segundos.',
    'aviso_10': 'Diez segundos.',
    'vuelve': 'Vuelve al ejercicio. {ejercicio}, serie {n} de {total}.',
    'cambio_lado': 'Cambia de lado.',
    'transicion': 'Siguiente ejercicio: {ejercicio}.',
    'pausa': 'En pausa.',
    'fin': 'Sesión terminada. Buen trabajo.',
}
dump('voz.json', voz)
print('tablas base listas')
