from PIL import Image, ImageOps;import numpy as np,json,sys
from scipy import ndimage
def cut(src):
  a=np.array(Image.open(src).convert('RGB')).astype(int);bg=np.median(np.concatenate([a[:4].reshape(-1,3),a[-4:].reshape(-1,3)]),0)
  d=np.abs(a-bg).sum(2);al=np.clip((d-60)*4,0,255).astype('uint8')
  rgb=a.copy();m=(rgb[...,0]>rgb[...,1]+12)&(rgb[...,2]>rgb[...,1]+5);rgb[m,0]=rgb[m,1]+6;rgb[m,2]=rgb[m,1]+2
  al=ndimage.grey_erosion(al,size=3)
  return Image.fromarray(np.dstack([np.clip(rgb,0,255).astype('uint8'),al]),'RGBA')
def comps(im,minsz=60):
  al=np.array(im)[...,3]>60;lab,n=ndimage.label(ndimage.binary_closing(al,iterations=4))
  ob=[o for o in ndimage.find_objects(lab) if (o[0].stop-o[0].start)>minsz and (o[1].stop-o[1].start)>minsz]
  return ob
def cells(im):
  ob=comps(im);ob.sort(key=lambda o:((o[0].start+o[0].stop)/2>im.height/2, o[1].start));return [im.crop((o[1].start,o[0].start,o[1].stop,o[0].stop)) for o in ob]
