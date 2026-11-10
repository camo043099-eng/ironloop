// Ironloop — guía por voz con degradación en tres niveles:
// 1) TTS (plugin de Capacitor si existe; si no, speechSynthesis) 2) pitidos + vibración 3) solo pantalla.
import { ajustes } from './almacen.js';

let ctxAudio = null;
function pitido(freq = 880, ms = 140) {
  try {
    ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctxAudio.createOscillator(), g = ctxAudio.createGain();
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.15, ctxAudio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctxAudio.currentTime + ms / 1000);
    o.connect(g); g.connect(ctxAudio.destination);
    o.start(); o.stop(ctxAudio.currentTime + ms / 1000);
  } catch { /* sin audio */ }
}
export function vibrar(patron = 60) {
  if (ajustes().vibracion && navigator.vibrate) navigator.vibrate(patron);
}
export function hablar(texto) {
  if (!texto) return;
  const aj = ajustes();
  if (aj.voz) {
    try {
      const plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TextToSpeech;
      if (plugin) { plugin.speak({ text: texto, lang: 'es-ES', rate: 1.0 }); return; }
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = 'es-ES'; u.rate = 1.02;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
        return;
      }
    } catch { /* cae a pitidos */ }
  }
  if (aj.pitidos) { pitido(880, 150); setTimeout(() => pitido(880, 150), 220); }
}
export function cuentaAtras(n) { // 3, 2, 1
  if (ajustes().pitidos) pitido(n === 1 ? 1320 : 880, n === 1 ? 220 : 120);
  vibrar(30);
}
export function frase(plantilla, vars) {
  return (plantilla || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
