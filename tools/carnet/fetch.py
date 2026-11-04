import json, os, subprocess, hashlib
from concurrent.futures import ThreadPoolExecutor
CD='/home/claude/cdragon'
ch=json.load(open(f'{CD}/champs.json')); sk=json.load(open(f'{CD}/skins.json'))
by={c['name']:c['id'] for c in ch if c['id']<10000}
RANK={'kTranscendent':7,'kExalted':6,'kUltimate':6,'kMythic':5,'kLegendary':4,'kEpic':3,'kRare':2,'kNoRarity':1}
DECKS={
 'jungle':[('Jarvan IV',6),('Lee Sin',6),('Zyra',4),('Dr. Mundo',4),('Pantheon',4),('Poppy',4),('Amumu',3),('Fiddlesticks',2)],
 'adc':[('Zeri',6),('Miss Fortune',10),('Xayah',8),("Kai'Sa",6),('Ezreal',8),('Tristana',4),('Sivir',4),('Caitlyn',5),('Fiddlesticks',3),('Amumu',2)],
 'top':[('Renekton',12),('Zaahen',1),('Gwen',6),('Yone',11)],
 'mid':[('Hwei',3),('Orianna',11),('Syndra',11),('Twisted Fate',6),('Fiddlesticks',1)],
 'support':[("Vel'Koz",7),('Pyke',11),('Nautilus',10),('Shaco',2),('Caitlyn',1)],
}
used=set(); out={}
jobs=[]
for deck, lst in DECKS.items():
    out[deck]=[]
    for name,n in lst:
        cid=by[name]
        c=[s for s in sk.values() if s['id']//1000==cid and not s.get('isBase')]
        c.sort(key=lambda s:(-RANK.get(s.get('rarity'),0), -s['id']))
        k=0
        for s in c:
            p=s.get('uncenteredSplashPath') or s.get('splashPath')
            if not p or p in used: continue
            used.add(p); k+=1
            f=f'img/{deck}-{len(out[deck]):02d}.jpg'
            out[deck].append({'champ':name,'name':s['name'],'id':s['id'],'path':p,'file':f})
            jobs.append((p,f))
            if k>=n: break
def dl(j):
    p,f=j
    url='https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/'+p.replace('/lol-game-data/assets/','').lower()
    if not os.path.exists(f):
        subprocess.run(['curl','-sSfL','-o',f+'.raw',url],check=False)
        if os.path.exists(f+'.raw'):
            subprocess.run(['python3','-c',f"from PIL import Image;im=Image.open('{f}.raw').convert('RGB');im.thumbnail((1920,1920));im.save('{f}',quality=84)"])
            os.remove(f+'.raw')
    return f, os.path.exists(f)
with ThreadPoolExecutor(8) as ex:
    res=list(ex.map(dl,jobs))
print('ok',sum(1 for _,o in res if o),'/',len(res))
for f,o in res:
    if not o: print('FAIL',f)
json.dump(out,open('skins.json','w'),ensure_ascii=False,indent=1)
