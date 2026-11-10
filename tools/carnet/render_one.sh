#!/bin/bash
# render_one.sh <deck> <sid...> : rend des slides précises en JPG dans /tmp/one/
deck=$1; shift; D=/home/claude/carnet/$deck; mkdir -p /tmp/one
cd /home/claude/adc_render
HEAD=$(sed -n '1,/<\/style>/p' _s.html | sed 's/<\/style>.*$//')
for id in "$@"; do
  printf '%s section *{margin:0;box-sizing:border-box} section > *{position:relative} img{display:block}</style></head><body>%s</body></html>' "$HEAD" "$(cat $D/slides/$id.html)" > _one_$deck.html
  google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --allow-file-access-from-files --window-size=1920,1080 --virtual-time-budget=3000 --screenshot=/tmp/one/$deck-$id.png "file:///home/claude/adc_render/_one_$deck.html" >/dev/null 2>&1
done
python3 - "$deck" "$@" <<'PY'
import sys
from PIL import Image
d=sys.argv[1]; ids=sys.argv[2:]
ims=[Image.open(f'/tmp/one/{d}-{i}.png').convert('RGB').resize((800,450)) for i in ids]
c=2; r=(len(ims)+c-1)//c
s=Image.new('RGB',(800*c,450*r))
for k,im in enumerate(ims): s.paste(im,((k%c)*800,(k//c)*450))
s.save(f'/tmp/one/sheet.jpg',quality=85)
PY
