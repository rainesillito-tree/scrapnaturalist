import cv2, numpy as np, os, json
from seg import comps
from cut import cutcomp
OUT='/home/claude/scrapnaturalist/images/cutouts/'
# (source sheet, comp id, slug, title, group, tags, split)
M=[
 (2,2,'halo-front-smoke','Halo Skeleton, Front, with Cigarette','figures',['halo','front','cigarette']),
 (2,9,'flower-front-smoke','Flower Crown Skeleton, Front, with Cigarette','figures',['flower crown','front','cigarette']),
 (2,25,'halo-stroll','Halo Skeleton, Slouching Walk','poses',['halo','walking','cigarette']),
 (2,34,'flower-seated-smoke','Flower Crown Skeleton, Seated, with Cigarette','poses',['flower crown','seated','cigarette']),
 (2,38,'pair-leaning','Two Skeletons, Leaning Together','poses',['pair','seated','cigarette']),
 (1,9,'flower-standing-smoke','Flower Crown Skeleton, Standing, Smoking','figures',['flower crown','standing','cigarette']),
 (1,15,'flower-reading','Flower Crown Skeleton, Cross-Legged, Reading','poses',['flower crown','seated','reading','book']),
 (3,8,'pair-bench','Two Skeletons on a Bench','poses',['pair','bench','seated','halo','flower crown']),
 (3,14,'halo-profile','Halo Skeleton, Profile','figures',['halo','profile']),
 (3,23,'flower-profile','Flower Crown Skeleton, Profile','figures',['flower crown','profile']),
 (6,7,'flower-front-bare','Flower Crown Skeleton, Front','figures',['flower crown','front']),
 (6,9,'flower-bench','Flower Crown Skeleton on a Bench','poses',['flower crown','bench','seated']),
 (6,22,'flower-walking','Flower Crown Skeleton, Walking','poses',['flower crown','walking']),
 (7,90,'halo-arms-up','Halo Skeleton, Arms Raised','poses',['halo','arms raised','standing']),
 (7,92,'halo-crouch','Halo Skeleton, Chin on Hand','poses',['halo','seated','thinking']),
 (8,29,'halo-front-vintage','Halo Skeleton, Front (Engraved)','figures',['halo','front','engraved']),
 (8,33,'flower-front-vintage','Flower Crown Skeleton, Front (Engraved)','figures',['flower crown','front','engraved']),
 (8,35,'flower-three-quarter','Flower Crown Skeleton, Three-Quarter (Engraved)','figures',['flower crown','three-quarter','engraved']),
 (8,36,'flower-profile-vintage','Flower Crown Skeleton, Profile (Engraved)','figures',['flower crown','profile','engraved']),
 (8,37,'flower-back-vintage','Flower Crown Skeleton, Back (Engraved)','figures',['flower crown','back','engraved']),
 (8,80,'halo-reach','Halo Skeleton, Reaching Up (Engraved)','poses',['halo','arms raised','engraved']),
 (8,93,'halo-looking-up','Halo Skeleton, Looking Up (Engraved)','poses',['halo','standing','engraved']),
 (8,115,'halo-lotus','Halo Skeleton, Lotus Seat (Engraved)','poses',['halo','lotus','seated','meditation']),
 (2,24,'skull-front','Skull, Front','parts',['skull','front']),
 (2,33,'skull-side','Skull, Side','parts',['skull','profile']),
 (2,51,'skull-brain-swirl','Skull with a Swirl Brain','parts',['skull','cosmic','swirl']),
 (2,43,'skull-flowers-smoke','Flower Crown Skull with Cigarette','parts',['skull','flower crown','cigarette']),
 (8,30,'skull-flowers-neck','Flower Crown Skull, Three-Quarter (Engraved)','parts',['skull','flower crown','neck']),
 (8,67,'skull-flowers-front','Flower Crown Skull, Front (Engraved)','parts',['skull','flower crown']),
 (2,40,'hand-cigarette','Skeleton Hand with Cigarette','parts',['hand','cigarette']),
 (2,42,'hand-cigarette-raised','Skeleton Hand, Raised, with Cigarette','parts',['hand','cigarette']),
 (7,100,'forearm-hand','Forearm and Hand','parts',['hand','arm']),
 (7,101,'forearm-hand-bent','Forearm and Hand, Bent','parts',['hand','arm']),
 (7,106,'hand-open','Skeleton Hand, Open','parts',['hand']),
 (7,109,'hand-down','Skeleton Hand, Pointing Down','parts',['hand']),
 (8,124,'hand-engraved','Skeleton Hand (Engraved)','parts',['hand','engraved']),
 (8,125,'hand-wrist','Skeleton Hand and Wrist (Engraved)','parts',['hand','wrist']),
 (7,145,'ribcage-pelvis','Ribcage, Spine and Pelvis','parts',['ribcage','pelvis','spine']),
 (7,176,'flower-wreath-frame','Flower Wreath Frame','motifs',['flowers','wreath','frame']),
 (8,186,'galaxy','Spiral Galaxy','motifs',['galaxy','cosmic','space']),
 (8,205,'star-cloud','Starry Cloud','motifs',['cloud','stars','cosmic']),
 (8,216,'crescent','Crescent Moon','motifs',['moon','crescent']),
 (8,226,'moon-phases','Moon Phases','motifs',['moon','phases']),
 (8,220,'butterfly-line','Butterfly, Line Drawing','motifs',['butterfly']),
 (8,214,'pansy','Pansy','motifs',['flower','pansy']),
 (7,196,'blossom-a','Blossom with Stem','motifs',['flower']),
 (7,197,'blossom-b','Blossom, Five Petals','motifs',['flower']),
 (7,198,'blossom-c','Blossom, Open','motifs',['flower']),
 (7,192,'sprig','Leaf Sprig','motifs',['leaf','sprig']),
 (7,3,'compass-star','Compass Star','motifs',['star','compass']),
 (8,206,'star-eight','Eight-Point Star','motifs',['star']),
 (8,81,'star-four','Four-Point Star','motifs',['star']),
 (1,17,'flower-bold','Bold Five-Petal Flower','motifs',['flower']),
]
SPLIT=[(2,1,'pair-back-halo',('back-flower','Flower Crown Skeleton, Back','figures',['flower crown','back']),('halo-hold','Halo Skeleton, Holding a Cigarette','figures',['halo','front','cigarette'])),
       (3,20,'pair-front',('flower-front-wide','Flower Crown Skeleton, Front, Arms Down','figures',['flower crown','front']),('halo-front-wide','Halo Skeleton, Front, Arms Down','figures',['halo','front'])),
       (3,46,'pair-walk',('flower-walk-a','Flower Crown Skeleton, Walking','poses',['flower crown','walking']),('halo-walk','Halo Skeleton, Walking','poses',['halo','walking']))]
lines=[]; cache={}
def getc(i):
    if i not in cache: cache[i]=comps(i)
    return cache[i]
def save(rgba,slug,title,group,tags,alpha_ok=True):
    h,w=rgba.shape[:2]; s=min(1,1000/max(h,w))
    if s<1: rgba=cv2.resize(rgba,None,fx=s,fy=s,interpolation=cv2.INTER_AREA)
    from PIL import Image
    Image.fromarray(cv2.cvtColor(rgba,cv2.COLOR_BGRA2RGBA)).save(OUT+'sk-'+slug+'.webp','WEBP',quality=88,method=6)
    h,w=rgba.shape[:2]
    lines.append((group,'    { id:"sk-%s-cut", category:"skeletons", group:"%s", title:"%s", image:"images/cutouts/sk-%s.webp", w:%d, h:%d, alpha:true, tags:%s },'%(slug,group,title,slug,w,h,json.dumps(tags+['skeleton','rai']))))
for i,j,slug,title,group,tags in M:
    im,lab,out,sc,k=getc(i); r=cutcomp(im,lab,j,sc)
    if r is None: print('none',i,j); continue
    save(r,slug,title,group,tags)
for i,j,_,a,b in SPLIT:
    im,lab,out,sc,k=getc(i); r=cutcomp(im,lab,j,sc)
    al=r[...,3]>128; w=r.shape[1]; cols=al.sum(0).astype(float)
    lo,hi=int(w*.38),int(w*.62); x=lo+int(np.argmin(cols[lo:hi]))
    for part,(slug,title,group,tags) in ((r[:,:x],a),(r[:,x:],b)):
        al2=part[...,3]>128; ys,xs=np.where(al2); part=part[ys.min():ys.max()+1,xs.min():xs.max()+1]
        save(part,slug,title,group,tags)
order={'figures':0,'poses':1,'parts':2,'motifs':3}
lines.sort(key=lambda t:order[t[0]])
open('sk_lines.txt','w').write('\n'.join(l for _,l in lines)+'\n'); print(len(lines))
