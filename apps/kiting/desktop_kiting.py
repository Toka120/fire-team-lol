"""FIRE Kiting : application Windows autonome (fenêtre WebView2, serveur local 127.0.0.1:17474).

Reconstruit à l'identique de la version d'origine : même port et même profil (%LOCALAPPDATA%\\FIRE Kiting\\WebView2),
donc les réglages, touches et records de chacun sont conservés. Ajout : le pont du menu admin (bridge.py).
"""
import argparse
import json
import os
import sys
import threading
import time
import traceback
import urllib.request
from pathlib import Path

import bridge
import server

server.APP_NAME = 'FIRE Kiting'


class Handler(server.Handler):
    def log_message(self, *args):
        pass

    def respond(self, head):
        path = self.path.split('?')[0]
        if path == '/bootstrap':
            body = b'<!doctype html><html><head><title>FIRE Kiting</title></head><body style="background:#0d0914"></body></html>'
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if not head:
                self.wfile.write(body)
            return
        if path == '/api/health':
            return self.send_json({'application': 'FIRE Kiting', 'local': True}, head)
        return super().respond(head)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--self-test', type=Path)
    args = parser.parse_args()
    server.DIST = Path(__file__).resolve().parent / 'dist'
    import webview
    webview.settings['OPEN_EXTERNAL_LINKS_IN_BROWSER'] = False
    http = None
    for port in (range(19174, 19184) if args.self_test else [17474]):
        try:
            http = server.LocalServer(('127.0.0.1', port), Handler)
            break
        except OSError:
            continue
    if not http:
        raise RuntimeError('FIRE Kiting est déjà ouvert, ou son port local est occupé.')
    thread = threading.Thread(target=http.serve_forever, daemon=True)
    thread.start()
    address = f'http://127.0.0.1:{http.server_port}/'
    data_root = Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'FIRE Kiting'
    profile = (args.self_test.parent / 'kiting-test-profile') if args.self_test else data_root / 'WebView2'
    profile.mkdir(parents=True, exist_ok=True)
    team_files = (args.self_test.parent / 'kiting-test-files') if args.self_test else data_root / 'equipe'
    server.TEAM_FILES = str(team_files)
    seed = {}
    if not args.self_test:
        try:
            seed = json.loads((data_root / 'migration.json').read_text(encoding='utf-8'))
            seed = {k: v for k, v in seed.items() if isinstance(k, str) and isinstance(v, str)
                    and (k.startswith('fire.kiting.') or k in ('fire.listen.theme', 'fire.listen.language'))}
        except Exception:
            seed = {}
    api = bridge.Api('kiting', (args.self_test.parent / 'kiting-test-data') if args.self_test else data_root, team_files)
    window = webview.create_window('FIRE - Kiting', address + 'bootstrap', js_api=api, width=1380, height=940,
                                   min_size=(360, 640), background_color='#0d0914', hidden=bool(args.self_test))

    def loaded():
        if window.evaluate_js('location.pathname') == '/bootstrap':
            window.evaluate_js('(()=>{if(localStorage.getItem("fire.kiting.migration.applied"))return;const seed=' + json.dumps(seed)
                               + ';for(const [k,v]of Object.entries(seed))if(localStorage.getItem(k)===null)localStorage.setItem(k,v);localStorage.setItem("fire.kiting.migration.applied","1");})()')
            window.load_url(address + 'kiting/index.html')

    window.events.loaded += loaded

    def test():
        result = {'passed': False, 'frozen': bool(getattr(sys, 'frozen', False))}
        try:
            for _ in range(120):
                time.sleep(.5)
                try:
                    if window.evaluate_js('Boolean(window.FireKiting && window.FireAdmin && window.FireAdmin.ready)'):
                        break
                except Exception:
                    pass
            else:
                raise AssertionError('Kiting failed to load')
            result['health'] = json.load(urllib.request.urlopen(address + 'api/health', timeout=5))
            result['admin'] = window.evaluate_js('window.FireAdmin.info()')
            result['teamLoaded'] = window.evaluate_js('Boolean(window.FireTeam && window.FireTeam.loaded)')
            result['passed'] = bool(result['health'].get('local')) and bool(result['admin'])
        except Exception:
            result['error'] = traceback.format_exc()
        args.self_test.write_text(json.dumps(result, indent=2), encoding='utf-8')
        window.destroy()

    webview.start(test if args.self_test else None, gui='edgechromium', private_mode=False, storage_path=str(profile))
    http.shutdown()
    http.server_close()
    thread.join(timeout=3)
    if args.self_test and not json.loads(args.self_test.read_text(encoding='utf-8')).get('passed'):
        raise SystemExit(1)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        if '--self-test' in sys.argv:
            out = Path(sys.argv[sys.argv.index('--self-test') + 1])
            out.write_text(json.dumps({'passed': False, 'error': traceback.format_exc()}), encoding='utf-8')
        else:
            import ctypes
            ctypes.windll.user32.MessageBoxW(None, str(sys.exc_info()[1]), 'FIRE Kiting', 16)
        sys.exit(1)
