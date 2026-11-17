// FIRE LoL: independently implemented, browser-independent quiz rules.
export const MODES = Object.freeze({
  fun: { lives: null, costs: null, abilities: [0, 1, 2, 3] },
  classic: { lives: 3, costs: null, abilities: [0, 1, 2, 3] },
  abilities: { lives: 3, costs: [20, 20, 20, 35], abilities: [0, 1, 2, 3] },
  ult: { lives: 3, costs: null, abilities: [3] },
});
// Niveaux créés par les admins de l'équipe (menu admin) : mêmes règles que les modes, plus un tirage limité de champions.
export const LEVELS = {};
export const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export class Game {
  constructor(champions, mode, random = Math.random) {
    if (!MODES[mode] && !LEVELS[mode]) throw new Error('Unknown mode');
    this.catalog = champions;
    this.mode = mode;
    this.rules = MODES[mode] || LEVELS[mode];
    this.random = random;
    this.eligible = champions.filter(c => (!this.rules.pool || this.rules.pool.includes(c.id)) && this.rules.abilities.some(i => c.sounds[i]?.length));
    if (this.rules.count && this.eligible.length > this.rules.count) {
      const list = this.eligible.slice();
      for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
      this.eligible = list.slice(0, this.rules.count);
    }
    this.remaining = new Set(this.eligible.map(c => c.id));
    this.total = this.remaining.size;
    this.score = 0;
    this.missed = 0;
    this.lives = this.rules.lives;
    this.over = false;
    this.won = false;
    this.pick();
  }
  pick() {
    const pool = this.eligible.filter(c => this.remaining.has(c.id));
    this.current = pool[Math.min(pool.length - 1, Math.floor(this.random() * pool.length))] || null;
    this.heard = new Set();
    this.variants = [0, 0, 0, 0];
    if (!this.current) { this.over = true; this.won = true; }
  }
  get points() {
    return this.rules.costs ? 120 - [...this.heard].reduce((n, i) => n + this.rules.costs[i], 0) : 1;
  }
  listen(index) {
    if (this.over || !this.current || !this.rules.abilities.includes(index)) return null;
    const files = this.current.sounds[index] || [];
    if (!files.length) return null;
    const variant = this.variants[index]++ % files.length;
    this.heard.add(index);
    return { path: files[variant], variant, index };
  }
  find(value) {
    const key = normalize(value);
    if (!key) return null;
    return this.catalog.find(c => [c.name, c.alias, ...(c.aliases || [])].some(name => normalize(name) === key)) || null;
  }
  submit(value) {
    if (this.over) return { status: 'finished' };
    const named = this.find(value);
    if (!named || !this.remaining.has(named.id)) return { status: 'invalid' };
    return this.resolve(named.id === this.current.id);
  }
  giveUp() { return this.over ? { status: 'finished' } : this.resolve(false); }
  resolve(correct) {
    const champion = this.current;
    const points = correct ? this.points : 0;
    this.remaining.delete(champion.id);
    if (correct) this.score += points;
    else { this.missed++; if (this.lives !== null) this.lives--; }
    if (this.lives === 0) { this.over = true; this.won = false; this.current = null; }
    else this.pick();
    return { status: correct ? 'correct' : 'wrong', champion, points, over: this.over, won: this.won };
  }
}
