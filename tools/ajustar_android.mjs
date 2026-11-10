// Ironloop CI: ajustes al proyecto Android recién generado por `cap add android`.
// Idempotente: minSdk 24, noCompress para media, <queries> TTS y fondo del icono.
import { readFileSync, writeFileSync } from 'node:fs';

function tocar(ruta, fn) {
  const antes = readFileSync(ruta, 'utf8');
  const despues = fn(antes);
  if (despues !== antes) { writeFileSync(ruta, despues); console.log('ajustado:', ruta); }
}
tocar('android/variables.gradle', x => x.replace(/minSdkVersion = \d+/, 'minSdkVersion = 24'));
tocar('android/app/build.gradle', x => x.includes('noCompress')
  ? x
  : x + "\n// Ironloop: media sin compresión AAPT\nandroid {\n    aaptOptions {\n        noCompress 'mp4', 'jpg', 'json'\n    }\n}\n");
tocar('android/app/src/main/AndroidManifest.xml', x => x.includes('<queries>')
  ? x
  : x.replace('</manifest>', `
    <queries>
        <intent>
            <action android:name="android.intent.action.TTS_SERVICE" />
        </intent>
    </queries>
</manifest>`));
tocar('android/app/src/main/res/values/ic_launcher_background.xml',
  x => x.replace('#FFFFFF', '#0A0C11'));
console.log('ajustes Android OK');
