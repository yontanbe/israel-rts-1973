# Imports AI-generated art (raw jpgs from the art-src branch) into game-ready assets.
# python3 tools/importart.py /path/to/raw
import sys,os,numpy as np
from PIL import Image,ImageFilter
from scipy import ndimage
RAW=sys.argv[1];S='assets/s/';os.makedirs(S+'ill',exist_ok=True);os.makedirs(S+'por',exist_ok=True);os.makedirs(S+'fx',exist_ok=True)
def key(name):
  """chroma-key the flat magenta background (sampled from the border), soft edge, despill"""
  a=np.array(Image.open(f'{RAW}/{name}.jpg').convert('RGB')).astype(float)
  border=np.concatenate([a[:6].reshape(-1,3),a[-6:].reshape(-1,3),a[:,:6].reshape(-1,3),a[:,-6:].reshape(-1,3)]);bg=np.median(border,0)
  d=np.sqrt(((a-bg)**2).sum(2));al=np.clip((d-45)/55,0,1)
  # magenta-ish pixels (r and b both well above g) are background even if far from the sampled colour
  mag=(a[...,0]-a[...,1]>32)&(a[...,2]-a[...,1]>32);al[mag]=np.minimum(al[mag],.0)
  # keep the biggest connected objects, drop specks
  lab,n=ndimage.label(al>.5);
  if n>1:
    sz=ndimage.sum(np.ones_like(al),lab,range(1,n+1));keep=np.isin(lab,[i+1 for i,s in enumerate(sz) if s>max(sz)*.02]);al=al*ndimage.binary_dilation(keep,iterations=3)
  al=ndimage.grey_erosion(al,size=2);al=ndimage.gaussian_filter(al,.6)
  # despill: pull magenta fringe toward neutral
  sp=np.clip(np.minimum(a[...,0],a[...,2])-a[...,1],0,None)*(1-al)**.5;a[...,0]-=sp*.8;a[...,2]-=sp*.9
  im=Image.fromarray(np.dstack([np.clip(a,0,255),al*255]).astype('uint8'),'RGBA');return im.crop(im.getbbox())
def fit(im,w):h=round(im.height*w/im.width);return im.resize((w,h),Image.LANCZOS)
for n,w in [('maoz',300),('bridge',380),('barracks',320),('pillbox',300),('radar',300),('repair',320),('aa',320),('artillery',300),('airfield',420),('ruin_golan',300),('ruin_sinai',300)]:
  out={'repair':'repair_bay','aa':'aa_site'}.get(n,n);fit(key(n),w).save(S+out+'.png',optimize=True)
def nodisc(im):
  A=np.array(im).astype(float);r,g,b=A[...,0],A[...,1],A[...,2];sand=(r>150)&(g>110)&(b<150)&(r-b>45)&(np.abs(r-g)<70)
  H=A.shape[0];yy=np.arange(H)[:,None]*np.ones(A.shape[1])[None,:];m=sand&(yy>H*.45);A[...,3][m]*=.0;return Image.fromarray(A.astype('uint8'),'RGBA')
for n,w in [('inf_idle',110),('inf_move',110),('para_idle',120),('foe_inf',110)]:fit(key(n),w).save(S+n+'.png',optimize=True)
for i in list(range(1,11))+['win']:
  im=Image.open(f'{RAW}/ill_{i}.jpg').convert('RGB')
  if i==5:W,H=im.size;im=im.crop((int(W*.075),int(H*.1),int(W*.925),int(H*.9)))  # remove painted frame
  W,H=im.size;t=round(W*9/16);im=im.crop((0,(H-t)//2,W,(H-t)//2+t)) if t<H else im
  im.resize((1280,720),Image.LANCZOS).save(f'{S}ill/{i}.jpg',quality=80,optimize=True,progressive=True)
for n in ['noa','radio','pilot','foe']:Image.open(f'{RAW}/por_{n}.jpg').convert('RGB').resize((320,320),Image.LANCZOS).save(f'{S}por/{n}.jpg',quality=85,optimize=True)
def sheet(name,mode):
  a=np.array(Image.open(f'{RAW}/{name}.jpg').convert('RGB')).astype(float);H,W,_=a.shape
  if mode=='black':al=a.max(2)/255;al=np.clip((al-.06)*1.25,0,1);rgb=np.clip(a/np.maximum(al[...,None],1e-3),0,255)
  else:al=1-a.min(2)/255;al=np.clip((al-.06)*1.15,0,1);rgb=np.clip((a-255*(1-al[...,None]))/np.maximum(al[...,None],1e-3),0,255)
  im=Image.fromarray(np.dstack([rgb,al*255]).astype('uint8'),'RGBA');fw,fh=W//4,H//4;C=256;out=Image.new('RGBA',(C*4,C*4))
  for k in range(16):
    m=10 if mode=='white' else 4;c=im.crop(((k%4)*fw+m,(k//4)*fh+m,(k%4+1)*fw-m,(k//4+1)*fh-m)).resize((C-6,C-6),Image.LANCZOS);out.paste(c,((k%4)*C+3,(k//4)*C+3))
  if mode=='white':  # smoke columns: fade the top of each frame so the column never ends in a hard edge
    A=np.array(out).astype(float);
    for k in range(4):
      for j in range(80):A[k*C+j,:,3]*=(j/80)**1.5
    out=Image.fromarray(A.astype('uint8'),'RGBA')
  out.save(f'{S}fx/{name[3:]}.png',optimize=True)
sheet('fx_boom','black');sheet('fx_smoke','white');sheet('fx_dust','black')
print('ok')
# ---- v5: 8-frame run cycles (2 rows x 4 cells) -> horizontal strip, every frame aligned on the feet
def keyimg(im):
  tmp=f'/tmp/_cell.jpg';im.convert('RGB').save(tmp,quality=95);global RAW;old=RAW;RAW='/tmp';
  try:
    os.replace(tmp,'/tmp/_cell.jpg');return key('_cell')
  finally:RAW=old
def strip(name,out,fw=128,fh=104,rows=2,cols=4):
  src=Image.open(f'{RAW}/{name}.jpg').convert('RGB');W,H=src.size;cw,ch=W//cols,H//rows;cells=[]
  for r in range(rows):
    for c in range(cols):
      m=10;cells.append(keyimg(src.crop((c*cw+m,r*ch+m,(c+1)*cw-m,(r+1)*ch-m))))
  sc=min(min(fw*.94/x.width,fh*.94/x.height) for x in cells);S=Image.new('RGBA',(fw*len(cells),fh))
  for i,x in enumerate(cells):
    x=x.resize((max(1,round(x.width*sc)),max(1,round(x.height*sc))),Image.LANCZOS);S.alpha_composite(x,(i*fw+(fw-x.width)//2,fh-x.height-2))
  S.save(S_+out+'.png',optimize=True)
S_=S
strip('sh_inf_run','run_inf');strip('sh_para_run','run_para');strip('sh_foe_run','run_foe')
fit(key('crate'),90).save(S+'crate.png',optimize=True)
print('v5 ok')
