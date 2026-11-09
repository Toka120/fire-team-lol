# Calcule, pour chaque vrai skin (pas les chromas), le point du splash art où se trouve le champion.
# Méthode : l'icône carrée « tile » de Riot est centrée sur le champion ; on la retrouve dans le splash
# (recherche d'image à plusieurs échelles) et on garde le centre trouvé. Résultat : app/splash.json
#   { "Malzahar": [[num, x%, y%], ...], ... }   (x%, y% = position du champion dans le splash Data Dragon)
import json, os, sys, io, concurrent.futures as cf, urllib.request
import numpy as np, cv2
cv2.setNumThreads(1)

CD = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'splash.json'
CACHE = '/tmp/spl'
os.makedirs(CACHE, exist_ok=True)
opener = urllib.request.build_opener()
opener.addheaders = [('User-Agent', 'FIRE-LoL-tools/1.0')]
urllib.request.install_opener(opener)

def get(url, name):
    p = os.path.join(CACHE, name)
    if os.path.exists(p):
        return open(p, 'rb').read() or None
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            b = r.read()
    except Exception:
        b = b''
    open(p, 'wb').write(b)
    return b or None

def img(b, color=False):
    if not b: return None
    return cv2.imdecode(np.frombuffer(b, np.uint8), cv2.IMREAD_COLOR if color else cv2.IMREAD_GRAYSCALE)

ver = json.load(urllib.request.urlopen('https://ddragon.leagueoflegends.com/api/versions.json'))[0]
champs = json.load(urllib.request.urlopen(f'https://ddragon.leagueoflegends.com/cdn/{ver}/data/en_US/champion.json'))['data']
skins = json.load(urllib.request.urlopen(f'{CD}/v1/skins.json'))
bykey = {c['key']: c['id'] for c in champs.values()}

jobs = []
for sid, s in skins.items():
    sid = int(sid)
    key, num = str(sid // 1000), sid % 1000
    if key not in bykey: continue
    jobs.append((bykey[key], num, s.get('tilePath') or ''))

def hist(a):
    hsv = cv2.cvtColor(a, cv2.COLOR_BGR2HSV)
    hh = cv2.calcHist([hsv], [0, 1], None, [30, 32], [0, 180, 0, 256])
    return cv2.normalize(hh, hh).flatten()

def score(Sc, Tc, cx, cy, sz):
    """Ressemblance entre l'icône et le carré du splash centré en (cx, cy), de côté sz (pixels de Sc)."""
    H, W = Sc.shape[:2]
    x0, y0 = int(round(cx - sz / 2)), int(round(cy - sz / 2))
    x0, y0 = max(0, min(W - sz, x0)), max(0, min(H - sz, y0))
    if sz < 16 or sz > min(W, H): return -1
    crop = Sc[y0:y0 + sz, x0:x0 + sz]
    t = cv2.resize(Tc, (sz, sz), interpolation=cv2.INTER_AREA)
    ncc = cv2.matchTemplate(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY), cv2.cvtColor(t, cv2.COLOR_BGR2GRAY), cv2.TM_CCOEFF_NORMED)[0][0]
    hc = cv2.compareHist(hist(crop), hist(t), cv2.HISTCMP_CORREL)
    return 0.6 * float(ncc) + 0.4 * float(hc)

def work(j):
    cid, num, tile = j
    S = img(get(f'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{cid}_{num}.jpg', f'{cid}_{num}.jpg'), True)
    if S is None: return (cid, num, None)
    T = None
    if tile:
        tp = tile.lower().replace('/lol-game-data/assets/assets/', '').replace('/lol-game-data/assets/', '')
        T = img(get(f'{CD}/assets/{tp}', f'{cid}_{num}_tile.jpg'), True)
    if T is None: return (cid, num, [50, 40, 0])
    h0, w0 = S.shape[:2]
    f = 480 / w0
    Sc = cv2.resize(S, (int(w0 * f), int(h0 * f)), interpolation=cv2.INTER_AREA)
    Sg = cv2.cvtColor(Sc, cv2.COLOR_BGR2GRAY); Tg = cv2.cvtColor(T, cv2.COLOR_BGR2GRAY)
    H, W = Sg.shape
    cands = []
    # 1) recherche d'image à plusieurs tailles : on garde le meilleur endroit pour chaque taille
    for sz in np.geomspace(H * 0.12, H * 1.0, 24):
        sz = int(sz)
        if sz < 20 or sz > H or sz > W: continue
        res = cv2.matchTemplate(Sg, cv2.resize(Tg, (sz, sz), interpolation=cv2.INTER_AREA), cv2.TM_CCOEFF_NORMED)
        _, mv, _, ml = cv2.minMaxLoc(res)
        cands.append((ml[0] + sz / 2, ml[1] + sz / 2, sz))
    # 2) points caractéristiques (SIFT), plus robustes quand l'éclairage change
    try:
        sift = cv2.SIFT_create(nfeatures=2500)
        Sfull = cv2.cvtColor(S, cv2.COLOR_BGR2GRAY)
        k1, d1 = sift.detectAndCompute(Tg, None); k2, d2 = sift.detectAndCompute(Sfull, None)
        if d1 is not None and d2 is not None and len(k1) >= 4 and len(k2) >= 4:
            m = cv2.BFMatcher().knnMatch(d1, d2, k=2)
            good = [a for a, b in (x for x in m if len(x) == 2) if a.distance < 0.75 * b.distance]
            if len(good) >= 2:
                src = np.float32([k1[g.queryIdx].pt for g in good]); dst = np.float32([k2[g.trainIdx].pt for g in good])
                M = None
                if len(good) >= 3:
                    M, _ = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=8)
                if M is not None:
                    c = M @ np.array([T.shape[1] / 2, T.shape[0] / 2, 1.0]); sc = float(np.hypot(M[0, 0], M[0, 1]))
                    cands.append((c[0] * f, c[1] * f, int(T.shape[1] * sc * f)))
                else:
                    cands.append((float(np.median(dst[:, 0])) * f, float(np.median(dst[:, 1])) * f, int(H * 0.35)))
    except Exception:
        pass
    best = (-2, W / 2, H * 0.4)
    for cx, cy, sz in cands:
        if not (0 <= cx <= W and 0 <= cy <= H): continue
        sc_ = score(Sc, T, cx, cy, int(sz))
        if sc_ > best[0]: best = (sc_, cx, cy)
    sc_, cx, cy = best
    if sc_ < 0.35: return (cid, num, [50, 40, round(sc_, 2)])
    return (cid, num, [round(cx / W * 100, 1), round(cy / H * 100, 1), round(sc_, 2)])

out, low, miss = {}, 0, 0
with cf.ProcessPoolExecutor(os.cpu_count() or 4) as ex:
    for i, (cid, num, r) in enumerate(ex.map(work, jobs)):
        if r is None: miss += 1; continue
        if r[2] < 0.35: low += 1
        out.setdefault(cid, []).append([num, r[0], r[1], r[2]])
        if i % 200 == 0: print(i, len(jobs), file=sys.stderr, flush=True)
for k in out: out[k].sort()
json.dump({'version': ver, 'skins': out}, open(OUT, 'w'), separators=(',', ':'))
print('skins', sum(len(v) for v in out.values()), 'sans splash', miss, 'faible confiance', low)
