import sys,pickle; sys.path.insert(0,'/home/claude/scrapnaturalist/tools')
from cut_sheets import *
U='/root/.claude/uploads/a51ce13b-e88e-5c56-9d77-f6f1d1200f48/'
cfg={
 'statues':('d6c00bb5-image.png',dict(thresh=10,close=21,merge=15,fill=0.002)),
 'animals':('204e6e44-image.jpg',dict(thresh=12,close=3,merge=35,fill=0.0004,soft=1.2)),
 'sea':('41fd9201-image.jpg',dict(thresh=12,close=3,merge=35,fill=0.0004,soft=1.2)),
 'ephem':('34d9506a-image.jpg',dict(thresh=5,close=9,merge=15,fill=1.0,min_area=0.003)),
 'flowers':('dc91b980-image.jpg',dict(thresh=12,close=3,merge=35,fill=0.0004,soft=1.2)),
 'stars':('5b21b5ed-image.png',dict(thresh=12,close=11,merge=5,fill=0.01)),
 'whitefl':('e928072f-image.jpg',dict(thresh=3,close=9,merge=45,fill=0.01,min_area=0.0008)),
 'plants':('117477ee-image.jpg',dict(thresh=28,close=3,merge=40,fill=0.0004,min_area=0.002,erode=3)),
 'fashion':('fdf45744-image.jpg',dict(thresh=14,merge=3,close=13,fill=1.0,drop_border=True,min_area=0.002)),
}
for k,(f,kw) in cfg.items():
    items=split(load(U+f),**kw)
    print(k,len(items))
    contact(items,'/tmp/cs/c_%s.png'%k)
    pickle.dump(items,open('/tmp/cs/%s.pkl'%k,'wb'))
