// FIRE — traitement de la voix (AudioWorklet), placé après la suppression de bruit par IA.
//
// 1. Anti-clavier : le signal est séparé en deux bandes (grave < 3,2 kHz et aigu au-dessus ; la somme redonne
//    exactement le signal). Un clic de touche est une montée d'énergie très brusque (moins de 2 ms) dans les aigus :
//    seule la bande aiguë est baissée pendant ~30 ms. Les voyelles et le corps de la voix (bande grave) ne sont
//    jamais touchés : la voix n'est pas coupée, le « clac » perd son mordant.
// 2. Anti-réverbération : un expandeur suit le niveau de ta voix. Ce qui traîne nettement sous ce niveau juste après
//    un mot (l'écho de la pièce, la résonance) est baissé en douceur, ce qui rend la voix plus sèche et plus nette.
//    Rien n'est coupé net : la baisse est progressive et limitée.
class FireVoiceFx extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    const o = (opts && opts.processorOptions) || {};
    this.keys = o.keys !== false;
    this.dry = o.dry !== false;
    const fs = sampleRate;
    // Passe-bas 2e ordre (Butterworth) à 3,2 kHz pour la séparation des bandes.
    const f0 = 3200, q = Math.SQRT1_2, w = 2 * Math.PI * f0 / fs, al = Math.sin(w) / (2 * q), cw = Math.cos(w), a0 = 1 + al;
    this.b0 = ((1 - cw) / 2) / a0; this.b1 = (1 - cw) / a0; this.b2 = this.b0; this.a1 = (-2 * cw) / a0; this.a2 = (1 - al) / a0;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    const k = (ms) => Math.exp(-1 / (fs * ms / 1000));
    // Enveloppes de la bande aiguë : rapide (clic) et lente (contexte).
    this.hf = 0; this.hs = 0; this.kfA = k(0.2); this.kfR = k(4); this.ksA = k(25); this.ksR = k(120);
    // Enveloppe de la bande grave (la voix) : un vrai début de syllabe monte aussi dans le grave, un clic presque pas.
    this.lf = 0; this.ls = 0; this.klA = k(1); this.klR = k(20); this.klsA = k(30); this.klsR = k(150);
    this.clickGain = 1; this.hold = 0; this.holdN = Math.round(fs * 0.03); this.kRel = k(25); this.kAtk = k(0.5);
    // Expandeur : enveloppe du signal, niveau de la voix (suit les crêtes, redescend lentement).
    this.env = 0; this.keA = k(1.5); this.keR = k(45); this.peak = 0; this.kpR = k(1500);
    this.g = 1; this.kgUp = k(0.5); this.kgDown = k(40);
    // Anticipation de 3 ms : la baisse des aigus est en place quand le clic arrive (3 ms de retard, inaudible).
    this.la = Math.round(fs * 0.003); this.lbLo = new Float32Array(this.la + 1); this.lbHi = new Float32Array(this.la + 1); this.li = 0;
    this.port.onmessage = (e) => { const d = e.data || {}; if ('keys' in d) this.keys = !!d.keys; if ('dry' in d) this.dry = !!d.dry; };
  }
  process(inputs, outputs) {
    const inp = inputs[0] && inputs[0][0];
    const out = outputs[0] && outputs[0][0];
    if (!out) return true;
    if (!inp) { out.fill(0); return true; }
    for (let i = 0; i < inp.length; i++) {
      const x = inp[i];
      const lo = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
      this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = lo;
      const hi = x - lo;
      let y = x;
      if (this.keys) {
        const ah = Math.abs(hi), alo = Math.abs(lo);
        this.hf = ah > this.hf ? this.kfA * this.hf + (1 - this.kfA) * ah : this.kfR * this.hf + (1 - this.kfR) * ah;
        this.hs = ah > this.hs ? this.ksA * this.hs + (1 - this.ksA) * ah : this.ksR * this.hs + (1 - this.ksR) * ah;
        this.lf = alo > this.lf ? this.klA * this.lf + (1 - this.klA) * alo : this.klR * this.lf + (1 - this.klR) * alo;
        this.ls = alo > this.ls ? this.klsA * this.ls + (1 - this.klsA) * alo : this.klsR * this.ls + (1 - this.klsR) * alo;
        // Clic : les aigus bondissent (×4 en un instant) alors que le grave ne bondit pas autant.
        const hiJump = this.hf > 4 * this.hs + 1e-4;
        const loJump = this.lf > 2.5 * this.ls + 1e-4;
        if (hiJump && !loJump) this.hold = this.holdN;
        const target = this.hold > 0 ? 0.08 : 1;
        if (this.hold > 0) this.hold--;
        this.clickGain = target < this.clickGain ? this.kAtk * this.clickGain + (1 - this.kAtk) * target : this.kRel * this.clickGain + (1 - this.kRel) * target;
        // Le signal sort avec 3 ms de retard, la décision (prise sur le présent) s'applique donc juste avant le clic.
        const j = this.li; const dlo = this.lbLo[j], dhi = this.lbHi[j];
        this.lbLo[j] = lo; this.lbHi[j] = hi; this.li = (j + 1) % this.lbLo.length;
        y = dlo + dhi * this.clickGain;
      }
      if (this.dry) {
        const a = Math.abs(y);
        this.env = a > this.env ? this.keA * this.env + (1 - this.keA) * a : this.keR * this.env + (1 - this.keR) * a;
        this.peak = this.env > this.peak ? this.env : this.kpR * this.peak;
        // Sous « voix − 22 dB », on baisse de 2:1, au plus de 12 dB : la queue de réverbération s'efface vite.
        const thr = this.peak * 0.08;
        let tg = 1;
        if (this.env < thr && this.peak > 1e-4) tg = Math.max(0.25, this.env / thr);
        // Remonte tout de suite quand tu reparles (aucun début de mot mangé), redescend en douceur.
        this.g = tg > this.g ? this.kgUp * this.g + (1 - this.kgUp) * tg : this.kgDown * this.g + (1 - this.kgDown) * tg;
        y *= this.g;
      }
      out[i] = y;
    }
    return true;
  }
}
registerProcessor('fire-voice-fx', FireVoiceFx);
