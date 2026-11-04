#!/bin/bash
# render.sh <deck> : rend les slides en JPG 1600x900 dans /home/claude/carnet/out-<deck>
d=$1; D=/home/claude/carnet/deck-$d; O=/home/claude/carnet/out-$d
rm -rf $O; mkdir -p $O
cd /home/claude/adc_render
HEAD=$(sed -n '1,/<\/style>/p' _s.html | sed 's/<\/style>.*$//')
i=0
for id in $(python3 -c "import json;print(' '.join(json.load(open('$D/deck.json'))['order']))"); do
  i=$((i+1)); n=$(printf %02d $i)
  printf '%s section *{margin:0;box-sizing:border-box} section > *{position:relative} img{display:block}</style></head><body>%s</body></html>' "$HEAD" "$(cat $D/slides/$id.html)" > _c_$d.html
  google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --allow-file-access-from-files --window-size=1920,1080 --virtual-time-budget=3000 --screenshot=/tmp/c_$d.png "file:///home/claude/adc_render/_c_$d.html" >/dev/null 2>&1
  python3 -c "from PIL import Image;Image.open('/tmp/c_$d.png').convert('RGB').resize((1600,900),Image.LANCZOS).save('$O/slide-$n.jpg',quality=86)"
done
python3 -c "
from PIL import Image;import glob
fs=sorted(glob.glob('$O/slide-*.jpg'));W,H=480,270;c=4;r=(len(fs)+c-1)//c
for part in range(0,len(fs),16):
  sub=fs[part:part+16];rr=(len(sub)+c-1)//c;s=Image.new('RGB',(W*c,H*rr))
  for i,f in enumerate(sub): s.paste(Image.open(f).resize((W,H)),((i%c)*W,(i//c)*H))
  s.save('/tmp/sheet-$d-%d.jpg'%(part//16),quality=85)"
echo done $d $i
