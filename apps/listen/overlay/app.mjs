import './motion.mjs';
import { Game, MODES, LEVELS, normalize } from './engine.mjs';
import { ListenTeam } from './team.mjs';

const root = document.getElementById('fire-listen');
const $ = id => root.querySelector(`#${id}`);
const absolute = path => new URL(path, import.meta.url).href;
const read = (key, fallback) => { try { return localStorage.getItem(`fire.listen.${key}`) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(`fire.listen.${key}`, String(value)); } catch {} };
let language = read('language', 'fr') === 'en' ? 'en' : 'fr';
const TEXT = {
  fr: {
    amethystAnimated: 'Améthyste animée', glacierAnimated: 'Glacier animé', emberAnimated: 'Braise animée', emeraldAnimated: 'Émeraude animée', motionHint: 'Les quatre thèmes fixes restent disponibles. Les fonds animés respectent la réduction des animations de votre appareil.',
    workshop: 'Atelier audio', settings: 'Paramètres', appearance: 'Apparence', themeHelp: 'Choisissez votre coloris. Votre préférence est enregistrée sur cet appareil.', amethyst: 'Améthyste', glacier: 'Glacier', ember: 'Braise', emerald: 'Émeraude', interfaceLanguage: 'Langue de l’interface', localSettings: 'Les thèmes et les langues sont disponibles hors connexion.', replay: 'Réécouter le dernier indice', stop: 'Arrêter la lecture',
    signalCaption: 'Chaque compétence a sa signature.', fourModes: '4 modes de jeu', answerLabel: 'Votre réponse', answerHelp: 'Identifiez le champion à partir des sons.', eyebrow: 'LEAGUE OF LEGENDS / QUIZ SONORE', hero: 'À vous de tendre l’oreille.', intro: 'Un son. Un champion. Faites confiance à votre mémoire.', console: '01 / ÉCOUTEZ LES INDICES', heading: 'VOTRE PROCHAINE SESSION', play: 'JOUER →', best: 'Record', noBest: 'Aucun record',
    modes: 'Modes', remaining: 'CHAMPIONS RESTANTS', score: 'SCORE', round: 'CETTE MANCHE', browse: 'Parcourir',
    submit: 'VALIDER', giveUp: 'PASSER', library: 'Bibliothèque vocale ↗', champions: 'Champions',
    browserHint: 'Choisissez un champion pour remplir la réponse. Les champions retirés sont grisés.', finalScore: 'SCORE FINAL',
    again: 'REJOUER', changeMode: 'CHANGER DE MODE', lives: 'VIES', missed: 'MANQUÉS', placeholder: 'Quel champion ? Écrivez son nom…',
    invalid: 'Choisissez un champion encore en jeu. Cette réponse ne coûte pas de vie.', correct: 'Bonne réponse', wrong: 'Il fallait trouver',
    victory: 'Terminé !', defeat: 'Défaite', wonText: 'Tous les champions ont été parcourus.', lostText: 'Plus de vies. Une nouvelle partie ?',
    newBest: 'NOUVEAU RECORD', missing: 'Aucun son disponible pour cette compétence', audioError: 'Lecture impossible. Vérifiez que le serveur local est lancé.',
    shortcut: 'Appuyez sur <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> pour écouter · <kbd>Échap</kbd> quitte le champ de réponse',
    roles: ['Tous', 'Top', 'Jungle', 'Mid', 'ADC', 'Support'], local: 'AUDIO LOCAL',
    cards: {
      fun: ['Pour le plaisir', 'Retrouvez les champions à votre rythme, sans limite de vies.', ['Vies illimitées', '1 point par champion']],
      classic: ['Classique', 'Identifiez chaque champion au son de ses compétences.', ['3 vies', '1 point par champion']],
      abilities: ['Écoute minimale', 'Écoutez moins de compétences pour marquer davantage de points.', ['3 vies', 'De 25 à 120 points']],
      ult: ['Ultimes uniquement', 'Une seule compétence pour reconnaître le champion : son ultime.', ['3 vies', 'R uniquement', '1 point par champion']],
    },
  },
  en: {
    amethystAnimated: 'Animated Amethyst', glacierAnimated: 'Animated Glacier', emberAnimated: 'Animated Ember', emeraldAnimated: 'Animated Emerald', motionHint: 'All four static themes remain available. Animated backgrounds respect your device’s reduced-motion preference.',
    workshop: 'Audio workshop', settings: 'Settings', appearance: 'Appearance', themeHelp: 'Choose your colourway. Your preference is saved on this device.', amethyst: 'Amethyst', glacier: 'Glacier', ember: 'Ember', emerald: 'Emerald', interfaceLanguage: 'Interface language', localSettings: 'All themes and languages are available offline.', replay: 'Replay the last clue', stop: 'Stop playback',
    signalCaption: 'Every ability has a signature.', fourModes: '4 game modes', answerLabel: 'Your answer', answerHelp: 'Identify the champion from the sounds.', eyebrow: 'LEAGUE OF LEGENDS / SOUND QUIZ', hero: 'Let your ears take the lead.', intro: 'One sound. One champion. Trust your memory.', console: '01 / LISTEN FOR CLUES', heading: 'YOUR NEXT SESSION', play: 'PLAY →', best: 'Best', noBest: 'No best score yet', modes: 'Modes',
    remaining: 'REMAINING CHAMPIONS', score: 'SCORE', round: 'THIS ROUND', browse: 'Browse', submit: 'LOCK IN', giveUp: 'SKIP',
    library: 'Voice library ↗', champions: 'Champions', browserHint: 'Pick a champion to fill the answer. Champions already out are greyed out.',
    finalScore: 'FINAL SCORE', again: 'PLAY AGAIN', changeMode: 'CHANGE MODE', lives: 'LIVES', missed: 'MISSED',
    placeholder: 'Who is it? Type a champion…', invalid: 'Choose a champion still in the game. No life was lost.', correct: 'Correct', wrong: 'It was',
    victory: 'Complete!', defeat: 'Defeat', wonText: 'You have played through every champion.', lostText: 'Out of lives. Try another game?',
    newBest: 'NEW BEST SCORE', missing: 'No sound available for this ability', audioError: 'Cannot play audio. Check the local server.',
    shortcut: 'Press <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> to listen · <kbd>Esc</kbd> leaves the text field',
    roles: ['All', 'Top', 'Jungle', 'Mid', 'ADC', 'Support'], local: 'LOCAL AUDIO',
    cards: {
      fun: ['Just for Fun', 'Work through the champions at your own pace, with unlimited lives.', ['No lives', '1 point per champion']],
      classic: ['Classic', 'Recognise every champion by the sounds of their abilities.', ['3 lives', '1 point per champion']],
      abilities: ['Fewest Abilities', 'Hear fewer abilities before your answer to earn more points.', ['3 lives', '25–120 points']],
      ult: ['Ult Only', 'Identify the champion using only the sound of their ultimate.', ['3 lives', 'Only R', '1 point per champion']],
    },
  },
};
const t = () => TEXT[language] || TEXT.fr;
const roleKeys = ['all', 'top', 'jungle', 'mid', 'adc', 'support'];
let champions = [], session = null, lastMode = 'classic', role = 'all';
let lastPlayedSlot = 0;
let matches = [], selection = -1, revealTimer, endTimer, playingSlot = -1;
const audio = { context: null, gain: null, analyser: null, source: null, token: 0, cache: new Map(), fallback: null };
let volume = Math.max(0, Math.min(100, Number(read('volume', '50')) || 0));
let unmutedVolume = volume || 50;

function picture(champion) {
  const image = new Image(); image.src = absolute(champion.icon); image.alt = ''; image.loading = 'lazy'; return image;
}
const cardOf = key => t().cards[key] || ListenTeam.card(key, language);
function modeCards() {
  $('modeCards').replaceChildren(...[...Object.keys(MODES), ...Object.keys(LEVELS)].map((key, index) => {
    const [name, description, badges] = cardOf(key);
    const button = document.createElement('button'); button.className = 'mode-card' + (LEVELS[key] ? ' team-level' : ''); button.dataset.mode = key;
    const title = document.createElement('h2'); title.textContent = name;
    const body = document.createElement('p'); body.textContent = description;
    const tags = document.createElement('div'); tags.className = 'badges';
    tags.replaceChildren(...badges.map(value => { const tag = document.createElement('span'); tag.textContent = value; return tag; }));
    const bottom = document.createElement('div'); bottom.className = 'card-bottom';
    const best = document.createElement('span'); const score = Number(read(`best.${key}`, '0'));
    best.textContent = score ? `${t().best} ${score}` : t().noBest;
    const play = document.createElement('b'); play.textContent = t().play; bottom.append(best, play);
    const number = document.createElement('span'); number.className = 'mode-number'; number.setAttribute('aria-hidden', 'true'); const shapes = ['M8 8v8m8-8v8M4 12h16', 'm12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Z', 'M4 16V8m5 13V3m6 15V6m5 8v-4', 'm13 2-9 12h7l-1 8 10-13h-7l0-7Z']; number.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${shapes[index % shapes.length]}"/></svg>`; button.append(number, title, body, tags, bottom); button.onclick = () => chooseMode(key); return button;
  }));
}
function translate() {
  document.documentElement.lang = language;
  $('settingsFrench').setAttribute('aria-pressed', String(language === 'fr')); $('settingsEnglish').setAttribute('aria-pressed', String(language === 'en'));
  $('closeSettings').setAttribute('aria-label', language === 'fr' ? 'Fermer' : 'Close');
  $('replayAudio').setAttribute('aria-label', playingSlot >= 0 ? t().stop : t().replay);
  for (const element of root.querySelectorAll('[data-t]')) element.textContent = t()[element.dataset.t];
  $('menuHeading').textContent = t().heading; $('guess').placeholder = t().placeholder;
  $('shortcutHint').innerHTML = t().shortcut; $('french').setAttribute('aria-pressed', String(language === 'fr')); $('language').setAttribute('aria-pressed', String(language === 'en')); $('closeBrowser').setAttribute('aria-label', language === 'fr' ? 'Fermer' : 'Close'); updateVolume();
  $('localLabel').textContent = t().local; modeCards(); renderRoles();
  if (session) { $('modeTitle').textContent = cardOf(session.mode)[0]; render(); if (!$('end').hidden) { $('endTitle').textContent = session.won ? t().victory : t().defeat; $('endText').textContent = session.won ? t().wonText : t().lostText; $('bestLabel').textContent = `${t().best} ${read(`best.${session.mode}`, '0')}`; } }
  if (!$('feedback').hidden) $('answerStatus').textContent = $('feedback').classList.contains('wrong') ? t().wrong : t().correct;
  if ($('notice').textContent) $('notice').textContent = t().invalid;
}
const themes = { amethyst: '#b26bff', glacier: '#24d7f5', ember: '#ff674d', emerald: '#26e3b1' };
for (const [key, colour] of Object.entries(themes)) themes[`${key}-animated`] = colour;
let theme = Object.hasOwn(themes, read('theme', 'amethyst')) ? read('theme', 'amethyst') : 'amethyst';
function setTheme(value) {
  if (!Object.hasOwn(themes, value)) return;
  theme = value; document.documentElement.dataset.theme = value; save('theme', value);
  root.querySelectorAll('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === value)));
}
setTheme(theme);
let settingsFocus;
function closeSettings() { $('settings').hidden = true; if (settingsFocus?.isConnected) settingsFocus.focus(); }
$('openSettings').onclick = () => { settingsFocus = document.activeElement; closeSuggestions(); $('settings').hidden = false; $('closeSettings').focus(); };
$('closeSettings').onclick = closeSettings;
$('settings').onclick = event => { if (event.target === $('settings')) closeSettings(); };
root.querySelectorAll('[data-theme-choice]').forEach(button => button.onclick = () => setTheme(button.dataset.themeChoice));
$('settingsFrench').onclick = () => setLanguage('fr');
$('settingsEnglish').onclick = () => setLanguage('en');
$('replayAudio').onclick = () => { if (!session || session.over) return; if (playingSlot >= 0) stopAudio(); else play(session.rules.abilities.includes(lastPlayedSlot) ? lastPlayedSlot : session.rules.abilities[0]); };

function chooseMode(key) {
  if (location.hash.slice(1) === key) start(key);
  else location.hash = key;
}
function route() {
  const key = location.hash.slice(1);
  if (MODES[key] || LEVELS[key]) start(key); else menu();
}
function menu() {
  stopAudio(); clearTimeout(revealTimer); clearTimeout(endTimer); session = null;
  $('menu').hidden = false; $('game').hidden = true; $('browser').hidden = true; $('end').hidden = true;
  document.title = 'FIRE LoL · Listen'; modeCards();
}
function start(key) {
  stopAudio(); clearTimeout(revealTimer); clearTimeout(endTimer);
  session = new Game(LEVELS[key] ? champions.concat(ListenTeam.extras) : champions, key); lastMode = key;
  $('menu').hidden = true; $('game').hidden = false; $('browser').hidden = true; $('end').hidden = true;
  $('feedback').hidden = true; $('guess').value = ''; $('notice').textContent = ''; closeSuggestions();
  $('modeTitle').textContent = cardOf(key)[0]; document.title = `${cardOf(key)[0]} · FIRE LoL`;
  render(); if (session.over) showEnd();
}
function render() {
  if (!session) return;
  $('lifeCaption').textContent = session.lives === null ? t().missed : t().lives;
  const lives = $('lives');
  if (session.lives === null) { lives.className = 'number'; lives.textContent = String(session.missed); }
  else {
    lives.className = 'hearts'; lives.setAttribute('aria-label', `${session.lives}/${session.rules.lives || 3}`);
    lives.innerHTML = Array.from({ length: session.rules.lives || 3 }, (_, index) => `<svg class="heart ${index >= session.lives ? 'lost' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C8 18 2 13 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 5-6 10-10 13Z"/></svg>`).join('');
  }
  $('remaining').textContent = String(session.remaining.size); $('score').textContent = String(session.score);
  $('roundStat').hidden = !session.rules.costs; $('roundPoints').textContent = String(session.points);
  $('abilities').classList.toggle('ultimate', session.mode === 'ult');
  root.querySelectorAll('.ability').forEach((button, index) => {
    button.hidden = !session.rules.abilities.includes(index);
    const files = session.current?.sounds[index] || [];
    button.disabled = session.over || files.length === 0;
    button.setAttribute('aria-label', `${language === 'fr' ? 'Écouter' : 'Play'} ${'QWER'[index]}`);
    button.title = files.length ? `${'QWER'[index]} · ${files.length}` : t().missing;
    button.querySelector('.cost').hidden = !session.rules.costs || session.heard.has(index) || !files.length;
    button.querySelector('.cost').textContent = session.rules.costs ? `−${session.rules.costs[index]}` : '';
    button.querySelector('.variants').innerHTML = files.length > 1 ? files.map((_, n) => `<i class="${n < session.variants[index] ? 'played' : ''}"></i>`).join('') : '';
  });
  $('submit').disabled = session.over; $('giveUp').disabled = session.over;
}

function context() {
  if (!audio.context) {
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) return null;
    audio.context = new Constructor(); audio.gain = audio.context.createGain(); audio.analyser = audio.context.createAnalyser();
    audio.analyser.fftSize = 512; audio.gain.gain.value = volume / 100;
    audio.gain.connect(audio.analyser); audio.analyser.connect(audio.context.destination);
  }
  return audio.context;
}
function stopAudio() {
  audio.token++; playingSlot = -1;
  $('replayAudio').setAttribute('aria-label', t().replay);
  $('replayAudio').innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z" fill="currentColor"/></svg>';
  if (audio.source) { try { audio.source.stop(); } catch {} audio.source = null; }
  if (audio.fallback) { audio.fallback.pause(); audio.fallback = null; }
  root.querySelectorAll('.ability').forEach(button => { button.classList.remove('playing'); button.style.setProperty('--energy', '0'); });
}
async function buffer(url) {
  if (audio.cache.has(url)) return audio.cache.get(url);
  const promise = fetch(url).then(response => { if (!response.ok) throw new Error('Audio HTTP ' + response.status); return response.arrayBuffer(); }).then(bytes => audio.context.decodeAudioData(bytes));
  audio.cache.set(url, promise);
  if (audio.cache.size > 24) audio.cache.delete(audio.cache.keys().next().value);
  try { return await promise; } catch (error) { audio.cache.delete(url); throw error; }
}
async function play(index) {
  lastPlayedSlot = index;
  if (!session || !$('settings').hidden || !$('browser').hidden || !$('end').hidden) return;
  const choice = session.listen(index); if (!choice) return;
  stopAudio(); const token = audio.token; playingSlot = index; render();
  $('replayAudio').setAttribute('aria-label', t().stop);
  $('replayAudio').innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6h12v12H6Z" fill="currentColor"/></svg>';
  const button = root.querySelector(`[data-slot="${index}"]`); button.classList.add('playing');
  try {
    const ctx = context();
    if (ctx) {
      await ctx.resume(); const decoded = await buffer(absolute(choice.path)); if (token !== audio.token) return;
      const source = ctx.createBufferSource(); source.buffer = decoded; source.connect(audio.gain); audio.source = source;
      source.onended = () => { if (token === audio.token) stopAudio(); }; source.start();
      ListenTeam.clip(session, () => { if (token === audio.token) stopAudio(); });
    } else {
      const player = new Audio(absolute(choice.path)); player.volume = volume / 100; audio.fallback = player;
      player.onended = () => { if (token === audio.token) stopAudio(); }; await player.play();
      ListenTeam.clip(session, () => { if (token === audio.token) stopAudio(); });
    }
    $('notice').textContent = '';
  } catch { if (token === audio.token) { stopAudio(); $('notice').textContent = t().audioError; } }
}
function chime(correct) {
  const ctx = context(); if (!ctx) return; ctx.resume().catch(() => {});
  const notes = correct ? [523.25, 659.25, 783.99] : [293.66, 233.08];
  notes.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator(), gain = ctx.createGain(), when = ctx.currentTime + index * .07;
    oscillator.frequency.value = frequency; oscillator.type = 'sine'; gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(.08, when + .01); gain.gain.exponentialRampToValueAtTime(.0001, when + .2);
    oscillator.connect(gain); gain.connect(audio.gain); oscillator.start(when); oscillator.stop(when + .22);
  });
}
function resolve(result) {
  if (result.status === 'finished') return;
  if (result.status === 'invalid') { $('notice').textContent = t().invalid; $('guess').select(); flash(false); return; }
  stopAudio(); closeSuggestions(); $('guess').value = ''; $('guess').blur(); $('notice').textContent = '';
  const correct = result.status === 'correct'; chime(correct); flash(correct);
  $('answerIcon').src = absolute(result.champion.icon); $('answerName').textContent = result.champion.name;
  $('answerStatus').textContent = correct ? `${t().correct}${session.rules.costs ? ' +' + result.points : ''}` : t().wrong;
  $('feedback').className = `feedback ${correct ? '' : 'wrong'}`; $('feedback').hidden = false;
  clearTimeout(revealTimer); revealTimer = setTimeout(() => { $('feedback').hidden = true; }, 2600);
  render();
  const detail = { mode: session.mode, championId: result.champion.id, correct, points: result.points, score: session.score, remaining: session.remaining.size };
  window.dispatchEvent(new CustomEvent('fire-listen:round', { detail }));
  if (window.parent !== window) window.parent.postMessage({ type: 'FIRE_LISTEN_ROUND', detail }, location.origin);
  if (result.over) endTimer = setTimeout(showEnd, 900);
}
function flash(correct) {
  const box = $('searchBox'); box.classList.remove('correct-flash', 'wrong-flash', 'shake');
  void box.offsetWidth; box.classList.add(correct ? 'correct-flash' : 'wrong-flash'); if (!correct) box.classList.add('shake');
  setTimeout(() => box.classList.remove('correct-flash', 'wrong-flash', 'shake'), 550);
}
function showEnd() {
  if (!session) return; stopAudio();
  const previous = Number(read(`best.${session.mode}`, '0')), improved = session.score > previous;
  if (improved) save(`best.${session.mode}`, session.score);
  $('endTitle').textContent = session.won ? t().victory : t().defeat;
  $('endText').textContent = session.won ? t().wonText : t().lostText;
  $('finalScore').textContent = String(session.score);
  $('bestLabel').textContent = improved ? t().newBest : `${t().best} ${Math.max(previous, session.score)}`;
  $('end').hidden = false; $('again').focus();
  window.dispatchEvent(new CustomEvent('fire-listen:end', { detail: { mode: session.mode, score: session.score, won: session.won } }));
}
function closeSuggestions() {
  $('suggestions').hidden = true; $('guess').setAttribute('aria-expanded', 'false'); $('guess').removeAttribute('aria-activedescendant'); selection = -1;
}
function suggestions() {
  const query = normalize($('guess').value); if (!query || !session) return closeSuggestions();
  matches = champions.filter(c => [c.name, c.alias].some(name => normalize(name).includes(query)))
    .sort((a, b) => Number(session.remaining.has(b.id)) - Number(session.remaining.has(a.id)) || Number(normalize(b.name).startsWith(query)) - Number(normalize(a.name).startsWith(query)) || a.name.localeCompare(b.name)).slice(0, 8);
  selection = -1;
  $('suggestions').replaceChildren(...matches.map((champion, index) => {
    const item = document.createElement('li'); item.id = `suggestion-${champion.id}`; item.setAttribute('role', 'option');
    item.classList.toggle('unavailable', !session.remaining.has(champion.id)); const name = document.createElement('span'); name.textContent = champion.name;
    item.append(picture(champion), name); item.onmousedown = event => { event.preventDefault(); selectSuggestion(index); }; return item;
  }));
  $('suggestions').hidden = matches.length === 0; $('guess').setAttribute('aria-expanded', String(matches.length > 0));
}
function selectSuggestion(index) {
  const champion = matches[index]; if (!champion || !session?.remaining.has(champion.id)) return;
  $('guess').value = champion.name; closeSuggestions(); $('guess').focus();
}
function renderRoles() {
  $('roleFilters').replaceChildren(...roleKeys.map((key, index) => {
    const button = document.createElement('button'); button.textContent = t().roles[index]; button.setAttribute('aria-pressed', String(key === role));
    button.onclick = () => { role = key; renderRoles(); renderBrowser(); }; return button;
  }));
}
function renderBrowser() {
  $('championGrid').replaceChildren(...champions.filter(c => role === 'all' || c.roles.includes(role)).map(champion => {
    const button = document.createElement('button'), name = document.createElement('span'); name.textContent = champion.name;
    button.disabled = !session?.remaining.has(champion.id); button.title = champion.name; button.append(picture(champion), name);
    button.onclick = () => { $('guess').value = champion.name; closeBrowser(); $('guess').focus(); }; return button;
  }));
}
function closeBrowser() { $('browser').hidden = true; $('browse').focus(); }
function updateVolume() {
  $('volume').value = String(volume); $('volumeValue').textContent = String(volume);
  $('mute').innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3Z" fill="currentColor"/>${volume ? '<path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="1.5"/>' : '<path d="m16 9 6 6m0-6-6 6" fill="none" stroke="currentColor" stroke-width="1.5"/>'}</svg>`;
  $('mute').setAttribute('aria-label', volume ? (language === 'fr' ? 'Couper le son' : 'Mute') : (language === 'fr' ? 'Rétablir le son' : 'Unmute'));
  if (audio.gain) audio.gain.gain.value = volume / 100; if (audio.fallback) audio.fallback.volume = volume / 100;
  save('volume', volume);
}

root.querySelectorAll('.ability').forEach(button => button.onclick = () => play(Number(button.dataset.slot)));
$('guessForm').onsubmit = event => { event.preventDefault(); if (session) resolve(session.submit($('guess').value)); };
$('giveUp').onclick = () => { if (session) resolve(session.giveUp()); };
$('guess').oninput = suggestions;
$('guess').onkeydown = event => {
  if (event.key === 'Escape') { closeSuggestions(); $('guess').blur(); event.preventDefault(); }
  if (['ArrowDown', 'ArrowUp'].includes(event.key) && !$('suggestions').hidden) {
    event.preventDefault(); selection = selection < 0 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1) : (selection + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
    [...$('suggestions').children].forEach((item, i) => { item.classList.toggle('active', i === selection); item.setAttribute('aria-selected', String(i === selection)); });
    $('guess').setAttribute('aria-activedescendant', `suggestion-${matches[selection].id}`);
  }
  if (event.key === 'Enter' && selection >= 0 && !$('suggestions').hidden) { event.preventDefault(); selectSuggestion(selection); }
};
$('browse').onclick = () => { if (!session || session.over) return; closeSuggestions(); renderBrowser(); $('browser').hidden = false; $('closeBrowser').focus(); };
$('closeBrowser').onclick = closeBrowser;
$('browser').onclick = event => { if (event.target === $('browser')) closeBrowser(); };
$('back').onclick = $('changeMode').onclick = () => { location.hash = ''; };
$('again').onclick = () => start(lastMode);
$('volume').oninput = () => { volume = Number($('volume').value); if (volume) unmutedVolume = volume; updateVolume(); };
$('mute').onclick = () => { if (volume) { unmutedVolume = volume; volume = 0; } else volume = unmutedVolume; updateVolume(); };
function setLanguage(value) { language = value; save('language', language); translate(); }
$('language').onclick = () => setLanguage('en');
$('french').onclick = () => setLanguage('fr');
document.addEventListener('click', event => { if (!$('searchBox').contains(event.target)) closeSuggestions(); });
document.addEventListener('keydown', event => {
  if (!$('settings').hidden) {
    if (event.key === 'Escape') { closeSettings(); event.preventDefault(); }
    if (event.key === 'Tab') { const items = [...$('settings').querySelectorAll('button')]; const first = items[0], last = items.at(-1); if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); } else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); } }
    return;
  }
  if (!$('browser').hidden) {
    if (event.key === 'Escape') { closeBrowser(); event.preventDefault(); }
    if (event.key === 'Tab') {
      const focusable = [...$('browser').querySelectorAll('button:not(:disabled)')]; const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
      if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
    }
    return;
  }
  if (!$('end').hidden) {
    if (event.key === 'Tab') { const buttons = [$('again'), $('changeMode')]; buttons[document.activeElement === buttons[0] ? 1 : 0].focus(); event.preventDefault(); }
    return;
  }
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  const index = 'qwer'.indexOf(event.key.toLowerCase()); if (index >= 0 && session) { event.preventDefault(); play(index); }
});
window.addEventListener('hashchange', route);

const canvas = $('wave'), drawing = canvas.getContext('2d');
let waveWidth = 640, waveHeight = 70;
new ResizeObserver(() => {
  const bounds = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
  waveWidth = bounds.width || 640; waveHeight = bounds.height || 70;
  canvas.width = Math.round(waveWidth * ratio); canvas.height = Math.round(waveHeight * ratio); drawing.setTransform(ratio, 0, 0, ratio, 0, 0);
}).observe(canvas);
const samples = new Uint8Array(512);
function animate() {
  if (!$('game').hidden) {
    drawing.clearRect(0, 0, waveWidth, waveHeight); drawing.beginPath(); drawing.lineWidth = 1;
    drawing.strokeStyle = playingSlot >= 0 ? themes[theme] : '#646078';
    if (audio.analyser && playingSlot >= 0) audio.analyser.getByteTimeDomainData(samples); else samples.fill(128);
    let energy = 0;
    for (let i = 0; i < samples.length; i++) {
      const value = (samples[i] - 128) / 128; energy += value * value;
      const x = i * waveWidth / (samples.length - 1), y = waveHeight / 2 + value * waveHeight * .46;
      if (i === 0) drawing.moveTo(x, y); else drawing.lineTo(x, y);
    }
    drawing.stroke();
    if (playingSlot >= 0) root.querySelector(`[data-slot="${playingSlot}"]`).style.setProperty('--energy', String(Math.min(1, Math.sqrt(energy / samples.length) * 5)));
  }
  requestAnimationFrame(animate);
}
animate();
try {
  const response = await fetch(absolute('./assets/catalog.json')); if (!response.ok) throw new Error('catalog');
  const catalog = await response.json(); champions = catalog.champions.filter(c => c.sounds.some(files => files.length));
  if (!champions.length) throw new Error('empty');
  $('catalogStatus').textContent = `${champions.length} champions · ${catalog.patch}`;
  await ListenTeam.ready(champions);
  $('loading').hidden = true; translate(); updateVolume(); route();
} catch {
  $('loading').textContent = location.protocol === 'file:' ? 'Lancez « Lancer FIRE Listen.bat » pour ouvrir le jeu et sa bibliothèque locale.' : 'Le catalogue local ne peut pas être chargé. Consultez LIRE-MOI.md.';
}
window.FireListen = Object.freeze({ start: chooseMode, menu: () => { location.hash = ''; }, getState: () => session ? { mode: session.mode, score: session.score, lives: session.lives, remaining: session.remaining.size, over: session.over } : null });
