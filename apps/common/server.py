"""Serveur local en lecture seule pour FIRE Kiting et FIRE Listen (127.0.0.1 uniquement).

Reconstruit à l'identique de la version d'origine (mêmes ports, même dossier « dist », même politique de sécurité),
avec un ajout : le dossier « team-files » où sont gardés les fichiers publiés par l'équipe (sons, etc.).
"""
import json
import mimetypes
import re
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'
VOICES = ROOT.parent / 'voicelines'
TEAM_FILES = None  # dossier des fichiers de l'équipe (réglé par l'application)
APP_NAME = 'FIRE'

TYPES = {'.mjs': 'text/javascript', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
         '.m4a': 'audio/mp4', '.webm': 'audio/webm', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.json': 'application/json',
         '.png': 'image/png', '.webp': 'image/webp', '.html': 'text/html; charset=utf-8', '.css': 'text/css'}
CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
       "media-src 'self' blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'")


class LocalServer(ThreadingHTTPServer):
    allow_reuse_address = False
    daemon_threads = True

    def server_bind(self):
        # Un seul FIRE Kiting / FIRE Listen à la fois sur ce port (Windows).
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def _inside(base, path):
    try:
        path.resolve().relative_to(base.resolve())
        return True
    except (ValueError, OSError):
        return False


class Handler(BaseHTTPRequestHandler):
    server_version = 'FIRE/1.0'

    def log_message(self, *args):
        pass

    def do_HEAD(self):
        self.respond(True)

    def do_GET(self):
        self.respond(False)

    def send_json(self, data, head=False):
        body = json.dumps(data).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def respond(self, head):
        path = unquote(urlsplit(self.path).path)
        if path == '/api/health':
            return self.send_json({'application': APP_NAME, 'local': True}, head)
        if path.startswith('/voicelines/'):
            base, rel = VOICES, path[len('/voicelines/'):]
        elif path.startswith('/team-files/') and TEAM_FILES:
            base, rel = Path(TEAM_FILES), path[len('/team-files/'):]
        else:
            base, rel = DIST, path.lstrip('/')
        target = (base / rel) if rel else base / 'index.html'
        if target.is_dir():
            target = target / 'index.html'
        if not _inside(base, target) or not target.is_file():
            self.send_error(404)
            return
        size = target.stat().st_size
        start, end = 0, size - 1
        status = 200
        rng = self.headers.get('Range')
        if rng:
            m = re.match(r'bytes=(\d*)-(\d*)', rng)
            if not m or size == 0:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{size}')
                self.end_headers()
                return
            if m.group(1):
                start = int(m.group(1))
                end = int(m.group(2)) if m.group(2) else size - 1
            else:
                start = max(0, size - int(m.group(2) or 0))
            end = min(end, size - 1)
            if start > end:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{size}')
                self.end_headers()
                return
            status = 206
        ctype = TYPES.get(target.suffix.lower()) or mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Accept-Ranges', 'bytes')
        if status == 206:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        if ctype.startswith('text/html'):
            self.send_header('Content-Security-Policy', CSP)
        self.end_headers()
        if head:
            return
        with open(target, 'rb') as f:
            f.seek(start)
            left = end - start + 1
            while left > 0:
                chunk = f.read(min(65536, left))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (ConnectionError, OSError):
                    return
                left -= len(chunk)
