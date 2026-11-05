from PIL import Image, ImageStat
import functools
@functools.lru_cache(None)
def lum(path):
    im = Image.open(path).convert('L')
    W, H = 1920, 1080
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)))
    ox = round((im.width - W) * 0.65); oy = round((im.height - H) * 0.30)
    im = im.crop((ox, oy, ox + W, oy + H)).crop((0, 120, 1300, 960))
    st = ImageStat.Stat(im)
    return st.mean[0] / 255
