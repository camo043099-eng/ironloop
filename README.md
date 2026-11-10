# Ironloop

Tablero de entrenamiento en español: rutinas generadas según tu objetivo, nivel, equipo y
lesiones; sesiones guiadas por voz con cronómetro de descanso; 1.324 ejercicios con video
y pasos en español.

- La media (fotos y videos) no vive en este repo: la CI la reconstruye desde
  [exercises-dataset](https://github.com/camo043099-eng/exercises-dataset) con
  `tools/preparar_media.py`.
- El proyecto Android se genera en la CI con Capacitor (`npx cap add android`) y se
  ajusta con `tools/ajustar_android.mjs` y `tools/generar_iconos.py`.
- Cada push a `main` compila el APK y lo publica en la última release.

Animaciones e imágenes: © Gym visual — https://gymvisual.com/
