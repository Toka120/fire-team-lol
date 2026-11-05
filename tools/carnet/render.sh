#!/bin/bash
# render.sh <deck> : rend toutes les slides en JPG 1600x900
deck=$1; D=/home/claude/carnet/$deck
rm -rf $D/out; mkdir -p $D/out
cd /home/claude/adc_render
HEAD=$(sed -n '1,/<\/style>/p' _s.html | sed 's/<\/style>.*$//')
i=0
for id in $(python3 -c "import json;print(' '.join(json.load(open('$D/deck.json'))['order']))"); do
  i=$((i+1)); n=$(printf %02d $i)
  printf '%s section *{margin:0;box-sizing:border-box} section > *{position:relative} img{display:block}</style></head><body>%s</body></html>' "$HEAD" "$(cat $D/slides/$id.html)" > _k_$deck.html
  google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --allow-file-access-from-files --window-size=1920,1080 --virtual-time-budget=3000 --screenshot=/tmp/k_$deck.png "file:///home/claude/adc_render/_k_$deck.html" >/dev/null 2>&1
  python3 -c "from PIL import Image;Image.open('/tmp/k_$deck.png').convert('RGB').resize((1600,900),Image.LANCZOS).save('$D/out/slide-$n.jpg',quality=86)"
done
python3 -c "
from PIL import Image;import glob
fs=sorted(glob.glob('$D/out/slide-*.jpg'));W,H=480,270;c=4;r=(len(fs)+c-1)//c
for p in range(0,r,4):
  s=Image.new('RGB',(W*c,H*4))
  for i,f in enumerate(fs[p*c:(p+4)*c]): s.paste(Image.open(f).resize((W,H)),((i%c)*W,(i//c)*H))
  s.save('/tmp/ks-$deck-%d.jpg'%(p//4),quality=85)"
