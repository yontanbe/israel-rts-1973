# Builds the extra building sprites from existing art (sandbags, crates, textures) so they match the style.
# Run from repo root: python3 tools/mkbuild.py
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops
import numpy as np, random
S='assets/s/'
random.seed(7);np.random.seed(7)
def L(n):return Image.open(S+n).convert('RGBA')
def sc(im,f):return im.resize((max(1,int(im.width*f)),max(1,int(im.height*f))),Image.LANCZOS)
def noise_tex(w,h,base,var=18,blur=1.2):
  a=np.random.normal(0,var,(h,w,1))+np.array(base)[None,None,:];im=Image.fromarray(np.clip(a,0,255).astype('uint8'),'RGB').filter(ImageFilter.GaussianBlur(blur));return im
def diamond(w,h,pad=0):
  return [(w/2,pad),(w-pad,h/2),(w/2,h-pad),(pad,h/2)]
def ground(W,H,col=(112,92,62),soft=10,shape='ellipse'):
  """soft dirt pad with darker rim, transparent outside"""
  tex=noise_tex(W,H,col,22,1.0).convert('RGBA')
  m=Image.new('L',(W,H),0);d=ImageDraw.Draw(m)
  if shape=='ellipse':d.ellipse((soft,soft,W-soft,H-soft),fill=255)
  else:d.polygon(diamond(W,H,soft),fill=255)
  m=m.filter(ImageFilter.GaussianBlur(soft/2));tex.putalpha(m);return tex
def shadow(im,off=(6,5),a=110,blur=4):
  al=im.split()[3].point(lambda v:v*a//255);sh=Image.new('RGBA',im.size,(0,0,0,0));sh.putalpha(al.filter(ImageFilter.GaussianBlur(blur)))
  c=Image.new('RGBA',(im.width+off[0]+blur*2,im.height+off[1]+blur*2),(0,0,0,0));c.alpha_composite(sh,(off[0]+blur,off[1]+blur));c.alpha_composite(im,(blur,blur));return c
def paste(c,im,x,y):c.alpha_composite(im,(int(x),int(y)))
def crop_alpha(im):b=im.getbbox();return im.crop(b) if b else im
def tent(w,h,col=(92,98,58)):
  """isometric ridge tent: two sloped faces + end gable, shaded canvas"""
  W,H=w+8,h+8;c=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(c)
  # base diamond-ish footprint: ridge runs from (x0,y0) to (x1,y1)
  r0=(w*.22,h*.18);r1=(w*.82,h*.42)
  fl=(w*.02,h*.52);fr=(w*.62,h*.98);bl=(w*.42,h*.08);br=(w*.98,h*.38)
  def shade(k):return tuple(int(v*k) for v in col)+(255,)
  d.polygon([r0,r1,fr,fl],fill=shade(1.0))          # front slope (lit)
  d.polygon([r0,r1,br,bl],fill=shade(.62))          # back slope
  d.polygon([r1,br,fr],fill=shade(.78))             # gable end
  d.polygon([(r1[0]-w*.02,r1[1]+h*.12),(r1[0]+w*.07,r1[1]+h*.2),(r1[0]+w*.02,r1[1]+h*.42),(r1[0]-w*.08,r1[1]+h*.3)],fill=(28,26,18,255)) # door
  d.line([r0,r1],fill=shade(1.25),width=2)
  for k in range(1,5):  # canvas seams
    t=k/5;a=(r0[0]+(r1[0]-r0[0])*t,r0[1]+(r1[1]-r0[1])*t);b=(fl[0]+(fr[0]-fl[0])*t,fl[1]+(fr[1]-fl[1])*t);d.line([a,b],fill=shade(.86),width=1)
  n=noise_tex(W,H,(128,128,128),14,.6).convert('L');al=c.split()[3]
  rgb=ImageChops.multiply(c.convert('RGB'),Image.merge('RGB',[n.point(lambda v:min(255,v+70))]*3));rgb.putalpha(al)
  o=Image.new('RGBA',(W,H),(0,0,0,0));ol=al.filter(ImageFilter.MaxFilter(3));o.putalpha(ol);oo=Image.new('RGBA',(W,H),(22,20,14,255));oo.putalpha(ol)
  out=Image.new('RGBA',(W,H));out.alpha_composite(oo);out.alpha_composite(rgb);return out
sb=[L('dec_sbag%d.png'%i) for i in range(3)];crate=L('dec_crate.png')
# ---------- 1. dug-in tank position (pillbox): U sandbag berm + dirt floor; turret drawn at runtime
def pit(W=150,H=118,name='pillbox',inner=None):
  c=Image.new('RGBA',(W,H),(0,0,0,0));paste(c,ground(W,int(H*.9),(98,80,54),12),0,H*.1)
  dark=Image.new('RGBA',(int(W*.62),int(H*.42)),(0,0,0,0));ImageDraw.Draw(dark).ellipse((0,0,dark.width,dark.height),fill=(40,30,18,150));dark=dark.filter(ImageFilter.GaussianBlur(5));paste(c,dark,W*.19,H*.36)
  if inner:paste(c,inner,W/2-inner.width/2,H*.52-inner.height/2)
  u=sc(sb[1],W*.78/sb[1].width);u=shadow(u,(4,4),90,3);paste(c,u,W*.11,H-u.height-2)
  return c
pb=pit();pb.save(S+'pillbox.png')
# ---------- 2. artillery position: wider pit with ammo crates
ar=pit(170,124);paste(ar,sc(crate,.2),8,30);paste(ar,sc(crate,.16),140,44);ar.save(S+'artillery.png')
# ---------- 3. barracks / infantry camp: tents + crates + sandbags on a pad
def barracks():
  W,H=170,128;c=Image.new('RGBA',(W,H),(0,0,0,0));paste(c,ground(W,H,(104,88,60),10,'diamond'),0,0)
  for (x,y,s) in [(22,14,1.0),(78,30,1.0),(34,52,.92)]:
    t=shadow(tent(int(70*s),int(52*s)),(5,4),100,3);paste(c,t,x,y)
  paste(c,shadow(sc(crate,.18)),118,70);paste(c,shadow(sc(crate,.14)),136,58)
  pole=ImageDraw.Draw(c);pole.line([(128,18),(128,52)],fill=(60,48,30,255),width=2);pole.polygon([(129,18),(150,22),(129,27)],fill=(235,235,240,255));pole.line([(129,20),(149,23)],fill=(40,80,200,255),width=1);pole.line([(129,25),(148,25)],fill=(40,80,200,255),width=1)
  s2=sc(sb[2],.42);paste(c,shadow(s2),W-s2.width-6,H-s2.height-4)
  return c
barracks().save(S+'barracks.png')
# ---------- 4. radar post: sandbagged pad + equipment shelter; dish drawn at runtime (rotates)
def radar():
  W,H=130,108;c=Image.new('RGBA',(W,H),(0,0,0,0));paste(c,ground(W,H,(100,86,60),10),0,0)
  sh=Image.new('RGBA',(52,40),(0,0,0,0));d=ImageDraw.Draw(sh);d.polygon([(2,14),(30,2),(50,12),(22,26)],fill=(126,128,96,255));d.polygon([(2,14),(22,26),(22,38),(2,26)],fill=(86,88,62,255));d.polygon([(22,26),(50,12),(50,24),(22,38)],fill=(104,106,76,255))
  for x in range(26,48,6):d.line([(x,24-(x-26)*.5),(x,34-(x-26)*.5)],fill=(70,72,50,255))
  paste(c,shadow(sh),14,40);paste(c,shadow(sc(crate,.14)),88,58)
  s=sc(sb[0],.45);paste(c,shadow(s),6,H-s.height-2)
  d=ImageDraw.Draw(c);d.ellipse((70,46,90,56),fill=(60,62,44,255));d.rectangle((77,26,83,52),fill=(72,74,56,255));d.rectangle((77,26,79,52),fill=(96,98,74,255))
  return c
radar().save(S+'radar.png')
# ---------- 5. field repair shop: re-tinted hangar with crane frame
def repair():
  f=L('war_factory.png');a=f.split()[3];rgb=ImageEnhance.Color(f.convert('RGB')).enhance(.55);rgb=ImageEnhance.Brightness(rgb).enhance(1.08)
  t=Image.new('RGB',rgb.size,(120,130,150));rgb=Image.blend(rgb,t,.12);rgb.putalpha(a);c=Image.new('RGBA',(f.width+20,f.height+10),(0,0,0,0));paste(c,rgb,10,10)
  d=ImageDraw.Draw(c);col=(214,170,40,255);d.line([(12,40),(12,104)],fill=col,width=3);d.line([(44,22),(44,86)],fill=col,width=3);d.line([(12,40),(44,22)],fill=col,width=3);d.line([(28,31),(28,60)],fill=(30,30,30,255),width=1)
  for y in range(46,100,10):d.line([(12,y),(16,y-4)],fill=(40,32,10,255),width=1)
  paste(c,shadow(sc(crate,.13)),c.width-34,c.height-30);return c
repair().save(S+'repair_bay.png')
# ---------- 6. airstrip: asphalt runway with markings, parked Phantom, fuel crates
def airfield():
  W,H=230,140;c=Image.new('RGBA',(W,H),(0,0,0,0));paste(c,ground(W,H,(110,94,64),10,'diamond'),0,0)
  asp=noise_tex(W,H,(62,60,56),10,.8).convert('RGBA');m=Image.new('L',(W,H),0);dm=ImageDraw.Draw(m)
  run=[(30,70),(150,10),(206,38),(86,98)];dm.polygon(run,fill=255);asp.putalpha(m);paste(c,asp,0,0)
  d=ImageDraw.Draw(c);d.line([run[0],run[1]],fill=(150,140,120,255),width=2);d.line([run[3],run[2]],fill=(40,38,34,255),width=2)
  for k in range(1,9):
    t=k/9.;x=58+(178-58)*t;y=84+(24-84)*t;d.line([(x-4,y+2),(x+4,y-2)],fill=(225,220,200,255),width=2)
  for k in range(4):x=40+k*7;y=76-k*3.5;d.line([(x,y-7),(x+9,y+5)],fill=(225,220,200,255),width=2)
  ph=sc(L('phantom.png').rotate(-62,expand=True,resample=Image.BICUBIC),.62);paste(c,shadow(ph,(10,12),100,4),118,14)
  paste(c,shadow(sc(crate,.15)),18,96);paste(c,shadow(sc(crate,.12)),44,108)
  wind=ImageDraw.Draw(c);wind.line([(196,70),(196,100)],fill=(80,70,50,255),width=2);wind.polygon([(197,70),(214,74),(197,79)],fill=(240,120,40,255))
  return c
airfield().save(S+'airfield.png')
# ---------- 7. Hawk AA battery for our side: SAM pit re-tinted to IDF khaki
def hawk():
  f=L('sam_site.png');a=f.split()[3];rgb=f.convert('RGB');rgb=Image.blend(rgb,Image.new('RGB',f.size,(150,140,100)),.18);rgb=ImageEnhance.Brightness(rgb).enhance(1.1);rgb.putalpha(a);return rgb
hawk().save(S+'aa_site.png')
# ---------- sidebar icons check sheet
ims=[Image.open(S+n) for n in ['pillbox.png','artillery.png','barracks.png','radar.png','repair_bay.png','airfield.png','aa_site.png']]
W=sum(i.width for i in ims)+10*len(ims);H=max(i.height for i in ims);sheet=Image.new('RGBA',(W,H),(86,74,52,255));x=0
for i in ims:sheet.alpha_composite(i,(x,0));x+=i.width+10
sheet.save('/tmp/bsheet.png')
print('ok')
