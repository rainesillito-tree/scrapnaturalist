import sys,json; sys.path.insert(0,'/home/claude/scrapnaturalist/tools'); sys.argv=['x','/tmp/cs/ovx']
import numpy as np, cv2
from PIL import Image
import make_overlays as mo
R='/home/claude/scrapnaturalist/'
A='/mnt/user-data/attachments/a51ce13b-e88e-5c56-9d77-f6f1d1200f48/'
import os; os.makedirs(R+'images/drawings',exist_ok=True); os.makedirs(R+'images/overlays',exist_ok=True)
def lift(path,thresh=60,close=11,hole=0.02,pad=10):
    im=Image.open(path).convert('RGB'); g=np.array(im.convert('L')); h,w=g.shape
    m=(g<255-thresh//1.0).astype(np.uint8)*255 if False else (g<200).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(close,close)))
    inv=255-m; n,lab,st,_=cv2.connectedComponentsWithStats(inv,4)
    for i in range(1,n):
        x,y,bw,bh,a=st[i]
        if x==0 or y==0 or x+bw>=w or y+bh>=h: continue
        if a<hole*w*h: m[lab==i]=255
    n,lab,st,_=cv2.connectedComponentsWithStats(m,8)
    for i in range(1,n):
        if st[i,4]<0.0004*w*h: m[lab==i]=0
    m=cv2.GaussianBlur(m,(0,0),1.0)
    rgba=np.dstack([np.array(im),m]); out=Image.fromarray(rgba,'RGBA')
    ys,xs=np.where(m>20); out=out.crop((max(xs.min()-pad,0),max(ys.min()-pad,0),xs.max()+pad,ys.max()+pad))
    s=1400/max(out.size); 
    return out.resize((round(out.width*s),round(out.height*s)),Image.LANCZOS) if s<1 else out
D=[('b1ef56de','skeleton-holding-heart','Skeleton Holding A Heart In Bloom','skeleton heart flowers daisies lavender'),
 ('6db3b2ac','ghost-skeleton-cigarette-left','Ghost Skeleton, Cigarette Raised','skeleton ghost sheet cigarette yarrow coneflower'),
 ('68001043','ghost-skeleton-cigarette-right','Ghost Skeleton, Hand On Hip','skeleton ghost sheet cigarette yarrow coneflower'),
 ('3779aa1b','skeleton-in-teacup','Skeleton Taking A Bath In A Teacup','skeleton teacup chamomile daisies'),
 ('cc0903a0','skeleton-yarrow-mushrooms','Skeleton Growing Yarrow And Mushrooms','skeleton yarrow mushrooms flowers')]
lines=[]
for f,id_,t,tags in D:
    import glob; p=glob.glob(A+f+'*')[0]
    im=lift(p); fn='images/drawings/%s.webp'%id_; im.save(R+fn,'WEBP',quality=90,method=4,exact=True); print(id_,im.size)
    lines.append('    { id:"dr-%s", category:"drawings", title:%s, image:"%s", w:%d, h:%d, alpha:true, tags:%s },'%(id_,json.dumps(t+', by the Luminarium'),fn,im.width,im.height,json.dumps(tags.split()+['luminarium','original','drawing','ink'])))
open('/tmp/cs/dr_lines.txt','w').write('\n'.join(lines)+'\n')
# tape
T=[('lilac-gingham','Washi Tape, Lilac Gingham','gingham',(238,230,246),(170,140,205),-2.0,900,190),('mint-stripes','Washi Tape, Mint Stripes','stripes',(214,236,226),(120,184,160),1.5,900,170),
('mustard-dots','Washi Tape, Mustard Dots','dots',(236,200,110),(252,246,226),-3.5,900,190),('terracotta','Washi Tape, Plain Terracotta','plain',(204,130,98),None,2.5,900,170),
('navy-grid','Washi Tape, Navy Grid','grid',(224,228,238),(46,66,120),-1.0,900,190),('blush-dots','Washi Tape, Blush Dots','dots',(246,214,214),(255,250,246),3.0,900,170),
('teal-stripes','Washi Tape, Teal Stripes','stripes',(204,228,230),(60,130,140),-2.5,900,190),('kraft','Washi Tape, Kraft Paper','plain',(206,170,122),None,1.0,900,170),
('sky-gingham','Washi Tape, Sky Gingham','gingham',(238,244,250),(120,164,206),-3.0,900,190),('cream-brown-dots','Washi Tape, Cream With Brown Dots','dots',(244,234,212),(122,84,56),2.0,900,170),
('short-rose','Washi Tape, Short Rose Strip','plain',(238,190,196),None,-5.0,420,170),('short-sage-stripes','Washi Tape, Short Sage Stripes','stripes',(214,226,206),(138,170,130),4.0,420,170),
('short-sun-grid','Washi Tape, Short Sunny Grid','grid',(250,232,168),(214,160,50),-4.0,420,170),('short-lilac-dots','Washi Tape, Short Lilac Dots','dots',(220,208,236),(250,246,255),5.0,420,170)]
tl=[]
for i,(id_,t,kind,c,acc,ang,W,H) in enumerate(T):
    im=mo.tape(300+i,kind,c,acc,W=W,H=H,angle=ang); fn='images/overlays/tape-%s.webp'%id_; im.save(R+fn,'WEBP',quality=88,method=4,alpha_quality=100)
    tl.append('    { id:"ov-tape-%s", category:"overlays", group:"tape", title:%s, image:"%s", w:%d, h:%d, alpha:true, tags:%s },'%(id_,json.dumps(t),fn,im.width,im.height,json.dumps(['washi','tape',kind,'translucent'])))
open('/tmp/cs/tape_lines.txt','w').write('\n'.join(tl)+'\n'); print(len(tl))
