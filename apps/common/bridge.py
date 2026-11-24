"""Pont entre l'interface de FIRE Kiting / FIRE Listen et le PC (window.pywebview.api).

- la clé admin donnée par le créateur (gardée sur ce PC, dans le profil de l'application) ;
- le contenu publié par l'équipe (niveaux, personnages, sorts, sons), lu dans le dépôt public de l'équipe ;
- l'envoi d'une publication : déposée dans %LOCALAPPDATA%\\FIRE\\envois, FIRE Team la vérifie puis l'envoie à l'équipe.
Les signatures sont vérifiées dans l'interface (WebCrypto) ; ce pont ne fait que lire et écrire des fichiers.
"""
import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

DATA_RAW = 'https://raw.githubusercontent.com/Toka120/fire-lol-data/main/'
LOCAL = Path(os.environ.get('LOCALAPPDATA', str(Path.home())))
OUTBOX = LOCAL / 'FIRE' / 'envois'
SAFE_APP = re.compile(r'^(kiting|listen)$')
SAFE_SHA = re.compile(r'^[0-9a-f]{64}$')
SAFE_EXT = re.compile(r'^(mp3|ogg|wav|m4a|webm)$')


def _get(url, timeout=12):
    req = urllib.request.Request(url + ('&' if '?' in url else '?') + 't=' + str(int(time.time())),
                                 headers={'User-Agent': 'FIRE-apps', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


class Api:
    def __init__(self, app, data_root, team_files):
        self._app = app
        self._root = Path(data_root)
        self._files = Path(team_files)
        self._root.mkdir(parents=True, exist_ok=True)
        self._files.mkdir(parents=True, exist_ok=True)

    # ----- Clé admin -----
    def key_get(self):
        try:
            return (self._root / 'cle-admin.txt').read_text(encoding='utf-8').strip()
        except OSError:
            return ''

    def key_set(self, value):
        value = re.sub(r'\s+', '', str(value or ''))[:4000]
        if not value.startswith('FIREKEY1.'):
            return False
        (self._root / 'cle-admin.txt').write_text(value, encoding='utf-8')
        return True

    def key_clear(self):
        try:
            (self._root / 'cle-admin.txt').unlink()
        except OSError:
            pass
        return True

    # ----- Contenu de l'équipe -----
    def team_get(self, app):
        app = str(app)
        if not SAFE_APP.match(app):
            return {'content': None, 'keys': None, 'offline': True}
        out, offline = {}, False
        for name, path in (('content', 'apps/' + app + '.json'), ('keys', 'apps/keys.json')):
            cache = self._root / ('equipe-' + name + '-' + app + '.json')
            try:
                data = json.loads(_get(DATA_RAW + path).decode('utf-8'))
                cache.write_text(json.dumps(data), encoding='utf-8')
                out[name] = data
            except urllib.error.HTTPError as e:
                if e.code == 404:  # rien de publié pour l'instant
                    out[name] = None
                    continue
                offline = True
            except Exception:
                offline = True
            if name not in out:
                try:
                    out[name] = json.loads(cache.read_text(encoding='utf-8'))
                except Exception:
                    out[name] = None
        out['offline'] = offline
        return out

    def team_file(self, path, sha, ext):
        """Télécharge un fichier publié (un son, par exemple), vérifie son empreinte et le sert en local."""
        sha, ext, path = str(sha), str(ext).lower(), str(path)
        if not SAFE_SHA.match(sha) or not SAFE_EXT.match(ext) or not re.match(r'^apps/[a-z]+/[\w.-]+$', path):
            return ''
        target = self._files / (sha + '.' + ext)
        if not target.is_file():
            try:
                data = _get(DATA_RAW + path, timeout=30)
            except Exception:
                return ''
            if hashlib.sha256(data).hexdigest() != sha:
                return ''
            target.write_bytes(data)
        return '/team-files/' + target.name

    # ----- Publication (relayée par FIRE Team) -----
    def publish(self, app, item):
        app = str(app)
        if not SAFE_APP.match(app):
            return {'ok': False, 'error': 'application inconnue'}
        text = item if isinstance(item, str) else json.dumps(item)
        if len(text) > 4_000_000:
            return {'ok': False, 'error': 'publication trop lourde (4 Mo au maximum)'}
        OUTBOX.mkdir(parents=True, exist_ok=True)
        name = app + '-' + time.strftime('%Y%m%d-%H%M%S') + '-' + uuid.uuid4().hex[:6]
        tmp = OUTBOX / (name + '.tmp')
        tmp.write_text(json.dumps({'v': 1, 'app': app, 'item': json.loads(text)}), encoding='utf-8')
        tmp.replace(OUTBOX / (name + '.json'))
        return {'ok': True, 'name': name}

    def publish_status(self, name):
        name = re.sub(r'[^\w.-]', '', str(name))
        res = OUTBOX / (name + '.resultat.json')
        if res.is_file():
            try:
                return json.loads(res.read_text(encoding='utf-8'))
            except Exception:
                return {'ok': False, 'error': 'résultat illisible'}
        if (OUTBOX / (name + '.json')).is_file():
            return {'pending': True}
        return {'pending': False, 'missing': True}

    # ----- Maintenance réglée dans le studio du FIRE Launcher (fichier signé, vérifié dans l'interface) -----
    def launcher_cfg(self):
        try:
            return json.loads(_get(DATA_RAW + 'launcher/config.json').decode('utf-8'))
        except Exception:
            return None

    def pending(self, app):
        try:
            return len([p for p in OUTBOX.glob(str(app) + '-*.json') if not p.name.endswith('.resultat.json')])
        except OSError:
            return 0
