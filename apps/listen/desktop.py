"""FIRE Listen : application Windows autonome (fenêtre WebView2, serveur local 127.0.0.1:17473).

Reconstruit à l'identique de la version d'origine : même port et même profil (%LOCALAPPDATA%\\FIRE Listen\\WebView2),
donc les réglages, records et suivis de chacun sont conservés. Ajout : le pont du menu admin (bridge.py).
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

server.APP_NAME = 'FIRE Listen'


class QuietHandler(server.Handler):
    def log_message(self, *args):
        pass


def configure_assets():
    bundle = Path(__file__).resolve().parent
    server.DIST = bundle / 'dist'
    executable = Path(sys.executable).resolve() if getattr(sys, 'frozen', False) else bundle / 'desktop.py'
    # Bibliothèque vocale facultative : un dossier « voicelines » à côté de FIRE Listen.exe (ou un ou deux niveaux au-dessus).
    for candidate in (executable.parent / 'voicelines', executable.parent.parent / 'voicelines', executable.parent.parent.parent / 'voicelines'):
        if (candidate / 'ecouter.html').is_file():
            server.VOICES = candidate
            return


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--self-test', type=Path)
    parser.add_argument('--workshop', action='store_true')
    args = parser.parse_args()
    configure_assets()
    import webview
    webview.settings['OPEN_EXTERNAL_LINKS_IN_BROWSER'] = False
    webview.settings['ALLOW_DOWNLOADS'] = True
    http = None
    for port in (range(19073, 19083) if args.self_test else [17473]):
        try:
            http = server.LocalServer(('127.0.0.1', port), QuietHandler)
            break
        except OSError:
            continue
    if not http:
        raise RuntimeError('FIRE Listen est déjà ouvert, ou son port local est occupé. Fermez l’ancienne fenêtre FIRE Listen puis relancez cette version.')
    thread = threading.Thread(target=http.serve_forever, daemon=True)
    thread.start()
    address = f'http://127.0.0.1:{http.server_port}/'
    data_root = Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'FIRE Listen'
    profile = (args.self_test.parent / 'native-test-profile') if args.self_test else data_root / 'WebView2'
    profile.mkdir(parents=True, exist_ok=True)
    team_files = (args.self_test.parent / 'listen-test-files') if args.self_test else data_root / 'equipe'
    server.TEAM_FILES = str(team_files)
    holder = {}

    class Api(bridge.Api):
        def open_voice_library(self):
            if server.VOICES and (Path(server.VOICES) / 'ecouter.html').is_file():
                webview.create_window('FIRE - Bibliothèque vocale', address + 'voicelines/ecouter.html', width=1100, height=800,
                                      min_size=(360, 640), background_color='#100b18')
            else:
                webview.create_window('FIRE - Bibliothèque vocale', html='<html><body style="background:#100b18;color:#eee;font:16px sans-serif;padding:32px"><h1>Bibliothèque vocale facultative</h1><p>Le quiz et ses sons sont déjà inclus.</p><p>Pour les répliques FR/EN, placez le dossier voicelines à côté de FIRE Listen.exe.</p></body></html>',
                                      width=600, height=300)

    api = Api('listen', (args.self_test.parent / 'listen-test-data') if args.self_test else data_root, team_files)
    window = webview.create_window('FIRE - Listen', address + ('review.html' if args.workshop else ''), js_api=api, width=1380, height=940,
                                   min_size=(360, 640), background_color='#0d0914', text_select=True, hidden=bool(args.self_test))
    holder['window'] = window

    def native_links():
        window.evaluate_js("const link=document.querySelector('footer a[data-t=library]'); if(link) link.onclick=e=>{e.preventDefault();window.pywebview.api.open_voice_library();};")

    window.events.loaded += native_links

    def test_native():
        report = {'passed': False, 'frozen': bool(getattr(sys, 'frozen', False)), 'native_window': True, 'external_browser': False}
        try:
            for _ in range(120):
                time.sleep(.5)
                try:
                    if window.evaluate_js("Boolean(window.FireListen && !document.getElementById('menu').hidden && window.FireAdmin && window.FireAdmin.ready)"):
                        break
                except Exception:
                    pass
            else:
                raise AssertionError('UI did not load')
            report['health'] = json.load(urllib.request.urlopen(address + 'api/health', timeout=5))
            catalog = json.load(urllib.request.urlopen(address + 'assets/catalog.json', timeout=5))
            report['champions'] = len(catalog['champions'])
            report['admin'] = window.evaluate_js('window.FireAdmin.info()')
            report['passed'] = bool(report['health'].get('local')) and report['champions'] > 100 and bool(report['admin'])
        except Exception:
            report['error'] = traceback.format_exc()
        args.self_test.parent.mkdir(parents=True, exist_ok=True)
        args.self_test.write_text(json.dumps(report, indent=2), encoding='utf-8')
        window.destroy()

    try:
        webview.start(test_native if args.self_test else None, gui='edgechromium', private_mode=False, storage_path=str(profile), debug=False)
    finally:
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
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(json.dumps({'passed': False, 'error': traceback.format_exc()}, indent=2), encoding='utf-8')
        else:
            import ctypes
            ctypes.windll.user32.MessageBoxW(None, 'FIRE Listen ne peut pas démarrer.\n\n' + str(sys.exc_info()[1]), 'FIRE Listen', 16)
        sys.exit(1)
