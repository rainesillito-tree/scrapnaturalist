#!/usr/bin/env python3
"""Cut word strips + stickers out of Rai's collage photos. Boxes are in 1000px-wide preview coords (x1.659 to original).
python3 tools/cut_collages.py  -> images/cutouts/cg-*.webp + tools/collage_archive_lines.txt"""
import os, re, json, numpy as np, cv2
from PIL import Image
A = '/mnt/user-data/attachments/a51ce13b-e88e-5c56-9d77-f6f1d1200f48/'
OUT = os.path.join(os.path.dirname(__file__), '..', 'images', 'cutouts')
IDS = '8f373828 05087e1d 00b17c09 a00182cf 8b38f18a ca36062a 7bcbdd16 6e92e1f6 4f8e90cd 3d5e33af 7c1a4e26 7e200d35 ca836882 d19cea22'.split()
K = 1.659
W = {  # page: [(text, box)]
 1: [("in the light",(88,566,248,610)),("Our atoms",(133,615,265,662)),("inhabit.",(230,670,355,720)),("the beautiful",(236,742,458,800))],
 2: [("Now I know I am grown",(76,375,350,455)),("for the",(136,455,243,510)),("presence of",(168,520,325,568)),("wonder",(288,607,397,653)),("is",(683,727,737,767)),("everywhere",(668,806,892,862))],
 3: [("This is a story",(83,582,228,635)),("of",(283,590,392,665)),("terrestrial",(173,675,302,727)),("love",(223,746,322,792))],
 4: [("dream with",(212,545,400,675)),("your",(402,512,512,610)),("heart",(545,452,615,582)),("you are",(310,875,457,992)),("imagination.",(435,838,575,965))],
 5: [("as unknowable",(203,596,362,654)),("cosmic rays",(260,658,417,714)),("as",(176,670,242,725)),("life",(223,738,287,792)),("is",(298,783,357,834)),("adventure",(230,860,400,907)),("hello my",(653,1013,802,1060)),("breath",(716,1086,822,1130))],
 6: [("in this",(158,958,245,1007)),("THE WILD UNKNOWN",(213,1013,707,1072)),("replace fear",(226,1095,430,1127)),("with curiosity",(478,1088,714,1120))],
 7: [("this",(253,778,332,820)),("grateful heart",(205,850,484,907)),("held",(406,1112,587,1197)),("by",(585,1148,727,1217)),("particles",(456,1248,580,1287)),("of earth",(628,1220,882,1302))],
 8: [("instinct",(120,668,262,707)),("depends on",(80,736,230,777)),("creativity",(136,811,302,857)),("possibility",(538,951,712,999)),("is",(738,958,807,1012)),("yours",(636,1008,747,1052))],
 9: [("find what",(121,610,260,659)),("possibilities",(178,673,374,722)),("shine",(151,768,245,810)),("hanging over",(203,816,347,862)),("the horizon",(270,880,399,924))],
 10: [("your dreams",(323,638,490,684)),("always",(314,708,420,757)),("exist",(383,748,480,787)),("hold tight,",(253,931,417,974))],
 11: [("your heart",(161,483,312,527)),("stronger than yesterday",(230,546,582,587))],
 13: [("remember",(63,838,207,887)),("the sky.",(70,903,165,942)),("the sun",(173,903,267,942)),("over",(283,896,374,947)),("softened ground,",(53,966,267,1012)),("the earth's skin.",(106,1040,300,1087))],
}
STICK = [  # (page, key, title, category, group, box, tags)
 (1,'butterfly-card','Butterfly Plate in a Frame','print',None,(500,292,952,842),['butterflies','plate','frame','engraving']),
 (1,'wren-engraving','Engraved Bird, Cut Out','cutouts','beasts',(38,1003,592,1268),['bird','engraving','black','ink']),
 (2,'butterfly-lace','Butterfly Sticker, Lace Wings','cutouts','beasts',(438,232,765,545),['butterfly','sticker','wings']),
 (2,'butterfly-pink','Butterfly Sticker, Rose','cutouts','beasts',(66,900,308,1152),['butterfly','sticker','pink']),
 (2,'yarrow','Yarrow, White','botanical',None,(222,538,705,898),['yarrow','white','flower']),
 (3,'moon-card','Moon Phases Card','celestial',None,(233,0,532,190),['moon','phases','card','diagram']),
 (3,'lace-doily','Lace Doily, Sheer','cutouts','paper',(483,882,912,1262),['lace','doily','white']),
 (4,'butterfly-orange','Butterfly Sticker, Orange','cutouts','beasts',(455,1012,643,1162),['butterfly','sticker','orange']),
 (5,'mushroom-plate','Fly Agaric Plate, Torn','botanical',None,(833,458,1000,1272),['mushroom','toadstool','plate','red']),
 (6,'rose-sticker','Red Roses Sticker','cutouts','herb',(698,882,927,1212),['rose','red','sticker']),
 (9,'cosmos-yellow','Yellow Cosmos Sticker','cutouts','herb',(588,952,902,1218),['cosmos','yellow','flower']),
 (10,'sticker-violet','Purple Flower Sticker','cutouts','herb',(52,912,162,1078),['flower','purple','sticker']),
 (10,'sticker-gerbera','Pink Daisy Sticker','cutouts','herb',(750,868,892,1062),['daisy','pink','sticker']),
 (10,'sticker-marigold','Marigold Sticker','cutouts','herb',(726,1072,902,1248),['marigold','yellow','sticker']),
 (10,'butterfly-blue','Blue Butterfly Sticker','cutouts','beasts',(158,1052,282,1182),['butterfly','blue','sticker']),
 (11,'moon-card-torn-a','Moon Card, Torn Corner','celestial',None,(765,345,967,548),['moon','card','torn']),
 (11,'moon-card-torn-b','Moon Card, Torn Strip','celestial',None,(470,668,692,880),['moon','card','torn']),
 (12,'daisy-blue','Blue Daisy Sticker','cutouts','herb',(0,955,192,1262),['daisy','blue','sticker']),
 (12,'lace-doily-two','Lace Doily, Round','cutouts','paper',(578,842,922,1202),['lace','doily','white']),
 (13,'fern-green','Pressed Fern, Green','cutouts','herb',(648,808,928,1205),['fern','pressed','green']),
 (13,'fern-small','Pressed Fern, Small','cutouts','herb',(278,1052,485,1228),['fern','pressed','green']),
 (14,'green-bird','Green Bird, Cut Out','cutouts','beasts',(0,828,212,1102),['bird','green','sticker']),
]

def slug(t): return re.sub(r'[^a-z0-9]+','-',t.lower()).strip('-')

def strip(im, box, pad=10):
    x0,y0,x1,y1 = [int(round(v*K)) for v in box]
    px0,py0,px1,py1 = max(x0-pad,0),max(y0-pad,0),min(x1+pad,im.shape[1]),min(y1+pad,im.shape[0])
    crop = im[py0:py1,px0:px1].copy()
    mask = np.zeros(crop.shape[:2],np.uint8)
    rect = (x0-px0+3,y0-py0+3,(x1-x0)-6,(y1-y0)-6)
    bg,fg = np.zeros((1,65)),np.zeros((1,65))
    cv2.grabCut(crop,mask,rect,bg,fg,4,cv2.GC_INIT_WITH_RECT)
    m = ((mask==1)|(mask==3)).astype(np.uint8)*255
    m = cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    cs,_ = cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    if not cs: return None
    c = max(cs,key=cv2.contourArea)
    (cx,cy),(w,h),ang = cv2.minAreaRect(c)
    if w < h and True: pass
    # make a clean rotated rectangle mask (strips are rectangles), slightly inset
    if w < h: ang += 90; w,h = h,w
    w2,h2 = int(w-4),int(h-4)
    if w2 < 20 or h2 < 12: return None
    M = cv2.getRotationMatrix2D((cx,cy),ang,1.0)
    M[0,2] += w2/2 - cx; M[1,2] += h2/2 - cy
    out = cv2.warpAffine(crop,M,(w2,h2),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)
    a = np.full((h2,w2),255,np.uint8)
    a = cv2.GaussianBlur(cv2.copyMakeBorder(a[2:-2,2:-2],2,2,2,2,cv2.BORDER_CONSTANT,value=0),(0,0),0.8)
    return Image.fromarray(np.dstack([cv2.cvtColor(out,cv2.COLOR_BGR2RGB),a]),'RGBA')

def sticker(im, box, pad=14):
    from rembg import remove, new_session
    x0,y0,x1,y1 = [int(round(v*K)) for v in box]
    c = Image.fromarray(cv2.cvtColor(im[max(y0-pad,0):y1+pad,max(x0-pad,0):x1+pad],cv2.COLOR_BGR2RGB))
    r = remove(c,session=new_session('u2netp'),post_process_mask=True)
    a = np.array(r.split()[-1]); ys,xs = np.where(a>10)
    if len(xs)==0: return None
    return r.crop((max(xs.min()-3,0),max(ys.min()-3,0),min(xs.max()+4,r.width),min(ys.max()+4,r.height)))

def save(img,name,maxside=760):
    s = min(1,maxside/max(img.size)); 
    if s<1: img = img.resize((max(1,int(img.width*s)),max(1,int(img.height*s))),Image.LANCZOS)
    img.save(os.path.join(OUT,name+'.webp'),'WEBP',quality=88,method=6); return img.size

if __name__=='__main__':
    pages = {i+1: cv2.imread(A+n+'-image.jpg') for i,n in enumerate(IDS)}
    lines=[]; used=set()
    for p,items in W.items():
        for t,b in items:
            r = strip(pages[p],b)
            if r is None: print('skip',p,t); continue
            n = 'cg-'+slug(t); 
            if n in used: n += f'-p{p}'
            used.add(n); w,h = save(r,n)
            grp = 'single' if ' ' not in t.strip() else 'lines'
            tags = ['word','collage','clipping']+[x for x in slug(t).split('-') if len(x)>2]
            lines.append(f'    {{ id:"{n}-cut", category:"words", group:"{grp}", title:"“{t}”", image:"images/cutouts/{n}.webp", w:{w}, h:{h}, alpha:true, tags:{json.dumps(tags)} }},')
    open(os.path.join(os.path.dirname(__file__),'collage_words_lines.txt'),'w').write('\n'.join(lines)+'\n')
    sl=[]
    for p,k,t,cat,grp,b,tags in STICK:
        try: r = sticker(pages[p],b)
        except Exception as e: print('fail',k,e); continue
        if r is None: print('empty',k); continue
        n='cg-'+k; w,h = save(r,n)
        g = f' group:"{grp}",' if grp else ''
        sl.append(f'    {{ id:"{n}-cut", category:"{cat}",{g} title:"{t}", image:"images/cutouts/{n}.webp", w:{w}, h:{h}, alpha:true, tags:{json.dumps(tags+["collage"])} }},')
    open(os.path.join(os.path.dirname(__file__),'collage_stickers_lines.txt'),'w').write('\n'.join(sl)+'\n')
