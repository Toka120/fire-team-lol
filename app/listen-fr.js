// League of Listen (lynge.tv, intégré dans Détente) traduit en français : remplace les textes de l'interface
// dans le cadre du jeu, y compris ceux qui apparaissent pendant la partie. Rien d'autre n'est modifié.
module.exports = `(() => {
  if (window.__fireFr) return; window.__fireFr = true;
  const T = {
    'Press': 'Appuie sur', 'or click an ability to listen ·': 'ou clique sur une compétence pour écouter ·', 'leaves the text field': 'quitte la zone de texte', 'Esc': 'Échap',
    'Choose a game mode': 'Choisis un mode de jeu', 'Just for Fun': 'Pour le plaisir', 'Just For Fun': 'Pour le plaisir',
    'No lives and no pressure. Play through every champion at your own pace.': 'Pas de vies, pas de pression : passe tous les champions à ton rythme.',
    'No lives': 'Sans vies', '1 point per champion': '1 point par champion', 'No best score yet': 'Pas encore de record', 'Play': 'Jouer', 'PLAY': 'JOUER',
    'Classic': 'Classique', 'Name every champion from the sound of their abilities.': 'Trouve chaque champion au son de ses compétences.',
    '3 lives': '3 vies', '1 life': '1 vie', 'Fewest Abilities': 'Le moins de sorts', 'The fewer abilities you listen to before guessing, the more points you get.': 'Moins tu écoutes de sorts avant de répondre, plus tu gagnes de points.',
    'Ult Only': 'Ulti seulement', 'You only get to hear the ultimate. Champions without an R sound are left out.': 'Tu n’entends que l’ultime. Les champions sans son de R sont retirés.',
    'Only R': 'R seulement', 'Lives': 'Vies', 'Remaining champions': 'Champions restants', 'Score': 'Score', 'Final score': 'Score final', 'Best score': 'Record', 'Best': 'Record',
    'Press Q W E R or click an ability to listen · Esc leaves the text field': 'Appuie sur Q W E R ou clique sur une compétence pour écouter · Échap quitte la zone de texte',
    'Browse': 'Parcourir', 'Lock in': 'Valider', 'Lock In': 'Valider', 'I give up': 'J’abandonne', 'Give up': 'Abandonner', 'Skip': 'Passer', 'Next': 'Suivant', 'Correct!': 'Bonne réponse !', 'Wrong!': 'Raté !', 'Correct': 'Bonne réponse', 'Wrong': 'Raté',
    'Modes': 'Modes', 'MODES': 'MODES', 'Buy me a beer 🍺': 'Offrir une bière à l’auteur 🍺', 'All': 'Tous',
 'Click a champion to fill in their name. Greyed out champions are already out of the game or not in this mode.': 'Clique sur un champion pour écrire son nom. Les champions grisés sont déjà sortis du jeu ou absents de ce mode.',
    'Play again': 'Rejouer', 'Change mode': 'Changer de mode', 'Back': 'Retour', 'Menu': 'Menu', 'Settings': 'Réglages', 'Volume': 'Volume', 'Sound': 'Son',
    'Type a champion name': 'Écris le nom d’un champion', 'Champion name': 'Nom du champion', 'Search': 'Rechercher', 'Hard': 'Difficile', 'Easy': 'Facile', 'Normal': 'Normal',
    'Game over': 'Partie terminée', 'Game Over': 'Partie terminée', 'New best score!': 'Nouveau record !', 'You guessed': 'Tu as trouvé', 'champions': 'champions', 'points': 'points',
    'Timed': 'Chrono', 'Endless': 'Sans fin', 'Hardcore': 'Hardcore', 'Daily': 'Du jour', 'Daily challenge': 'Défi du jour', 'Share': 'Partager', 'Copied!': 'Copié !',
  };
  const RX = [
    [/^Best score:?\\s*(\\d+)$/i, 'Record : $1'], [/^Score:?\\s*(\\d+)$/i, 'Score : $1'], [/^Final score:?\\s*(\\d+)$/i, 'Score final : $1'],
    [/^Remaining champions:?\\s*(\\d+)$/i, 'Champions restants : $1'], [/^(\\d+) lives$/i, '$1 vies'], [/^(\\d+) points? per champion$/i, '$1 point(s) par champion'],
    [/^Press Q W E R or click an ability to listen\s*·\s*Esc leaves the text field$/i, 'Appuie sur Q W E R ou clique sur une compétence pour écouter · Échap quitte la zone de texte'],
    [/^It was (.+)$/i, 'C’était $1'], [/^The answer was (.+)$/i, 'La réponse était $1'], [/^(\\d+) \\/ (\\d+) champions$/i, '$1 / $2 champions'],
  ];
  const tr = (s) => {
    const k = s.trim(); if (!k) return null;
    if (T[k]) return s.replace(k, T[k]);
    for (const [r, v] of RX) if (r.test(k)) return s.replace(k, k.replace(r, v));
    return null;
  };
  const walk = (root) => {
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while ((n = it.nextNode())) { const v = tr(n.nodeValue); if (v != null && v !== n.nodeValue) n.nodeValue = v; }
    if (root.querySelectorAll) for (const el of root.querySelectorAll('[placeholder],[title],[aria-label]')) for (const a of ['placeholder', 'title', 'aria-label']) { const x = el.getAttribute(a); const v = x && tr(x); if (v) el.setAttribute(a, v); }
  };
  const go = () => { try { walk(document.body); document.documentElement.lang = 'fr'; } catch (e) {} };
  go();
  new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'characterData') { const v = tr(m.target.nodeValue); if (v != null && v !== m.target.nodeValue) m.target.nodeValue = v; } else for (const x of m.addedNodes) { if (x.nodeType === 3) { const v = tr(x.nodeValue); if (v != null) x.nodeValue = v; } else if (x.nodeType === 1) walk(x); } } })
    .observe(document.body, { childList: true, subtree: true, characterData: true });
})();`;
