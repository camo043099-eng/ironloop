// Ironloop — máquina de estados de la sesión guiada.
// Reloj por marcas de tiempo (finEn contra Date.now()): sobrevive a pausas del WebView.
import { hablar, vibrar, cuentaAtras, frase } from './voz.js';

export class Sesion {
  constructor(bloques, porId, frases, alPintar, alTerminar) {
    this.bloques = bloques; this.porId = porId; this.frases = frases;
    this.alPintar = alPintar; this.alTerminar = alTerminar;
    this.fase = 'INACTIVA'; this.iEj = 0; this.serie = 1; this.lado = 'A';
    this.finEn = 0; this.dur = 0; this.pausa = false; this.restante = 0;
    this.hechas = []; this.tInicio = null; this.aviso10 = false; this.ultCuenta = 0;
    this.reloj = null;
  }
  get bloque() { return this.bloques[this.iEj]; }
  get ejercicio() { return this.porId.get(this.bloque.ej); }
  _entrar(fase, durMs, anuncio) {
    this.fase = fase; this.dur = durMs; this.finEn = Date.now() + durMs;
    this.aviso10 = false; this.ultCuenta = 0;
    if (anuncio) hablar(anuncio);
    if (fase === 'DESCANSO' || fase === 'TRANSICION') vibrar([45, 50, 45]);
    else if (fase === 'TRABAJO') vibrar(35);
    this.alPintar(this);
  }
  iniciar() {
    this.tInicio = Date.now();
    const e = this.ejercicio, b = this.bloque;
    this._entrar('PREPARA', 5000, frase(this.frases.preparate, { ejercicio: e.ne, n: 1, total: b.series }));
    this.reloj = setInterval(() => this._tick(), 200);
  }
  // Reanuda una sesión guardada (la app se cerró a mitad): entra en PREPARA
  // del bloque y la serie donde iba, conservando las series ya hechas.
  continuar(estado) {
    this.iEj = Math.min(estado.iEj || 0, this.bloques.length - 1);
    this.serie = estado.serie || 1; this.lado = estado.lado || 'A';
    this.hechas = Array.isArray(estado.hechas) ? estado.hechas : [];
    this.tInicio = estado.tInicio || Date.now();
    const e = this.ejercicio, b = this.bloque;
    this._entrar('PREPARA', 5000, frase(this.frases.preparate, { ejercicio: e.ne, n: this.serie, total: b.series }));
    this.reloj = setInterval(() => this._tick(), 200);
  }
  // Detiene el reloj sin registrar nada (al reemplazar la sesión por otra).
  detener() {
    if (this.reloj) clearInterval(this.reloj);
    this.reloj = null; this.fase = 'INACTIVA';
  }
  _tick() {
    if (this.pausa || this.fase === 'FIN' || this.fase === 'INACTIVA') return;
    const rest = this.finEn - Date.now();
    if (this.fase === 'DESCANSO' || this.fase === 'TRANSICION') {
      if (!this.aviso10 && rest <= 10200 && rest > 3000) { this.aviso10 = true; hablar(this.frases.aviso_10); }
      const seg = Math.ceil(rest / 1000);
      if (seg <= 3 && seg >= 1 && seg !== this.ultCuenta) { this.ultCuenta = seg; cuentaAtras(seg); }
    }
    if (rest <= 0) {
      if (this.fase === 'PREPARA' || this.fase === 'DESCANSO' || this.fase === 'TRANSICION') this._avanzar();
      else if (this.fase === 'TRABAJO' && this.bloque.tiempo_s) this.hecho();
    }
    this.alPintar(this);
  }
  _avanzar() {
    const e = this.ejercicio, b = this.bloque;
    if (this.fase === 'PREPARA') {
      if (b.tiempo_s) this._entrar('TRABAJO', b.tiempo_s * 1000, frase(this.frases.trabajo_tiempo, { seg: b.tiempo_s }));
      else this._entrar('TRABAJO', 3600000, frase(this.frases.trabajo_reps, { reps: b.reps ? b.reps[1] : '' }));
    } else if (this.fase === 'TRANSICION') {
      this._entrar('TRABAJO', b.tiempo_s ? b.tiempo_s * 1000 : 3600000,
        frase(this.frases.vuelve, { ejercicio: e.ne, n: this.serie, total: b.series }));
    } else if (this.fase === 'DESCANSO') {
      if (b.tiempo_s) this._entrar('TRABAJO', b.tiempo_s * 1000, frase(this.frases.trabajo_tiempo, { seg: b.tiempo_s }));
      else this._entrar('TRABAJO', 3600000, frase(this.frases.vuelve, { ejercicio: e.ne, n: this.serie, total: b.series }));
    }
  }
  hecho() {
    const b = this.bloque, e = this.ejercicio;
    this.hechas.push({ ej: b.ej, n: this.serie, lado: b.unilateral ? this.lado : null });
    vibrar(40);
    if (b.unilateral && this.lado === 'A') {
      this.lado = 'B';
      this._entrar('TRANSICION', 15000, this.frases.cambio_lado);
      return;
    }
    this.lado = 'A';
    if (this.serie < b.series) {
      this.serie++;
      this._entrar('DESCANSO', b.descanso_s * 1000, frase(this.frases.descanso, { seg: b.descanso_s }));
    } else if (this.iEj < this.bloques.length - 1) {
      this.iEj++; this.serie = 1;
      const sig = this.ejercicio;
      this._entrar('DESCANSO', b.descanso_s * 1000, frase(this.frases.transicion, { ejercicio: sig.ne }));
    } else this._fin(true);
  }
  saltar() {
    if (this.fase === 'PREPARA' || this.fase === 'DESCANSO' || this.fase === 'TRANSICION') this._avanzar();
    this.alPintar(this);
  }
  mas15() {
    if (this.fase === 'DESCANSO' || this.fase === 'TRANSICION') { this.finEn += 15000; this.dur += 15000; this.alPintar(this); }
  }
  pausaToggle() {
    if (this.fase === 'FIN') return;
    this.pausa = !this.pausa;
    if (this.pausa) { this.restante = this.finEn - Date.now(); hablar(this.frases.pausa); }
    else this.finEn = Date.now() + this.restante;
    this.alPintar(this);
  }
  terminar() { this._fin(false); }
  _fin(completada) {
    this.fase = 'FIN';
    if (this.reloj) clearInterval(this.reloj);
    hablar(this.frases.fin); vibrar([80, 60, 80]);
    this.alPintar(this);
    this.alTerminar({
      ts: new Date().toISOString(), duracion_s: Math.round((Date.now() - this.tInicio) / 1000),
      completada, series: this.hechas,
    });
  }
  restanteMs() { return this.pausa ? this.restante : Math.max(0, this.finEn - Date.now()); }
}
