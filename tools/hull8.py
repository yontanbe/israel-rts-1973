# One top-down hull image per tank -> 8 direction frames (rotate + iso squash .72 + side wall), ring pos to meta.json
import numpy as np,json,sys
from PIL import Image,ImageFilter
from scipy import ndimage as nd
L=200  # long side px (2x of legacy 100 -> meta s=2)
def key(p):
  a=np.asarray(Image.open(p).convert('RGB')).astype(int);r,g,b=a[...,0],a[...,1],a[...,2]
  mag=(r>150)&(g<100)&(b>80)&(r-g>110)&(b-g>60)
  al=(~mag).astype(np.uint8)*255
  lab,n=nd.label(al>0);big=np.argmax(nd.sum(al>0,lab,range(1,n+1)))+1;body=lab==big
  filled=nd.binary_fill_holes(body);hole=filled&~body
  g2=a.mean(2);cand=hole|((g2<55)&filled);yy,xx=np.where(filled);Y,X=np.mgrid[:a.shape[0],:a.shape[1]];bx0,bx1,by0,by1=xx.min(),xx.max(),yy.min(),yy.max();cand&=(X>bx0+.3*(bx1-bx0))&(X<bx0+.75*(bx1-bx0))&(Y>by0+.25*(by1-by0))&(Y<by0+.75*(by1-by0));cand=nd.binary_opening(cand,iterations=3);hl,hn=nd.label(cand);hb=np.argmax(nd.sum(cand,hl,range(1,hn+1)))+1;hm=hl==hb;cy,cx=nd.center_of_mass(hm)
  a=a.copy();a[hole|(filled&(a[...,0]-a[...,1]>55)&(a[...,2]-a[...,1]>35))]=(28,26,22)
  ys,xs=np.where(filled);x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
  rgba=np.dstack([a.astype(np.uint8),(filled*255).astype(np.uint8)])
  im=Image.fromarray(rgba,'RGBA').crop((x0,y0,x1+1,y1+1))
  s=L/im.width;im=im.resize((L,round(im.height*s)),Image.LANCZOS)
  return im,((cx-x0)*s,(cy-y0)*s)
M=json.load(open('assets/s/d/meta.json'))
for t in sys.argv[1:]:
  im,(rx,ry)=key(f'assets/src/h_{t}.jpg');W,H=im.size;m={}
  for d in range(8):
    a=d*45;big=Image.new('RGBA',(W*2,W*2));big.paste(im,(W-W//2,W-H//2),im)
    ox,oy=W-W//2+rx,W-H//2+ry
    r=big.rotate(-a,Image.BICUBIC);th=np.radians(a);dx,dy=ox-W,oy-W
    px,py=W+dx*np.cos(th)-dy*np.sin(th),W+dx*np.sin(th)+dy*np.cos(th)
    r=r.resize((W*2,round(W*2*.72)),Image.LANCZOS);py*=.72
    # side wall: darkened copy shifted down
    wall=Image.new('RGBA',r.size);sh=r.copy();arr=np.asarray(sh).copy();arr[...,:3]=(arr[...,:3]*.35).astype(np.uint8);sh=Image.fromarray(arr)
    for k in range(1,7):wall.alpha_composite(sh,(0,k))
    wall.alpha_composite(r);bb=wall.getbbox();out=wall.crop(bb)
    out.save(f'assets/s/d/hull_{t}_{d}.png',optimize=True)
    m[str(d)]=[round((px-bb[0])/out.width,3),round((py-bb[1])/out.height,3)]
  m['s']=2;M['hull_'+t]=m;print(t,m['0'],out.size)
json.dump(M,open('assets/s/d/meta.json','w'))
