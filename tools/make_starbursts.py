import sys,json; sys.path.insert(0,'/home/claude/scrapnaturalist/tools'); sys.argv=['x','/tmp/cs/ovx']
import numpy as np, cv2
from PIL import Image
import make_overlays as mo
R='/home/claude/scrapnaturalist/'
SS=3
def burst(seed,kind,N=420):
    r=np.random.RandomState(seed); S=N*SS; cv=np.zeros((S,S),np.float32); c=S/2
    def stroke(x0,y0,x1,y1,w,a):
        # slightly wobbly pencil line, drawn as several thin passes
        for k in range(r.randint(2,4)):
            n=12; xs=np.linspace(x0,x1,n)+r.normal(0,0.6*SS,n); ys=np.linspace(y0,y1,n)+r.normal(0,0.6*SS,n)
            pts=np.stack([xs,ys],1).astype(np.int32)
            cv2.polylines(cv,[pts],False,float(a*r.uniform(.55,1)),max(1,int(w*r.uniform(.7,1.2))),cv2.LINE_AA)
    R0=S*0.40
    if kind in('four','eight','twelve','sixteen'):
        n={'four':4,'eight':8,'twelve':12,'sixteen':16}[kind]; rot=r.uniform(-.2,.2)
        for i in range(n):
            ang=rot+i*2*np.pi/n; L=R0*(1 if (i%(n//4))==0 else (0.62 if i%2==0 else 0.42))*r.uniform(.92,1.06)
            g=S*0.035; stroke(c+np.cos(ang)*g,c+np.sin(ang)*g,c+np.cos(ang)*L,c+np.sin(ang)*L,1.6*SS,0.9)
    elif kind=='asterisk':
        for i in range(6):
            ang=i*np.pi/3+r.uniform(-.08,.08); L=R0*0.8*r.uniform(.9,1.05)
            stroke(c-np.cos(ang)*L,c-np.sin(ang)*L,c+np.cos(ang)*L,c+np.sin(ang)*L,1.7*SS,0.9)
    elif kind=='sparkle':   # four-point curved diamond star, double-lined
        for k,sc in ((1.0,0.9),(0.93,0.6)):
            pts=[]
            for t in np.linspace(0,2*np.pi,200):
                rr=R0*sc*k; pts.append((c+rr*np.cos(t)**3+r.normal(0,.5*SS),c+rr*np.sin(t)**3+r.normal(0,.5*SS)))
            cv2.polylines(cv,[np.array(pts,np.int32)],True,0.85*sc,int(1.6*SS),cv2.LINE_AA)
    elif kind=='scribble':  # hatched star, scribbled filled
        for i in range(10):
            ang=i*np.pi/5+r.uniform(-.05,.05); L=R0*(0.95 if i%2==0 else 0.55)
            stroke(c,c,c+np.cos(ang)*L,c+np.sin(ang)*L,1.5*SS,0.8)
        for k in range(26):
            a0=r.uniform(0,2*np.pi); rr=r.uniform(.04,.2)*S
            stroke(c+np.cos(a0)*rr,c+np.sin(a0)*rr,c-np.cos(a0+.4)*rr,c-np.sin(a0+.4)*rr,1.1*SS,0.7)
    elif kind=='cluster':
        for (dx,dy,sz,n) in ((-.22,.12,.5,8),(.2,-.18,.7,8),(.1,.26,.32,6)):
            cc=(c+dx*S,c+dy*S)
            for i in range(n):
                ang=r.uniform(0,.3)+i*2*np.pi/n; L=R0*sz*(1 if i%2==0 else .55)
                stroke(cc[0],cc[1],cc[0]+np.cos(ang)*L,cc[1]+np.sin(ang)*L,1.4*SS,0.9)
    elif kind=='radiant':  # sun-like: ring plus rays
        cv2.circle(cv,(int(c),int(c)),int(S*0.07),0.9,int(1.5*SS),cv2.LINE_AA)
        for i in range(14):
            ang=i*2*np.pi/14+r.uniform(-.04,.04); L=R0*(0.95 if i%2==0 else 0.68)
            stroke(c+np.cos(ang)*S*0.1,c+np.sin(ang)*S*0.1,c+np.cos(ang)*L,c+np.sin(ang)*L,1.5*SS,0.9)
    cv=cv2.GaussianBlur(cv,(0,0),0.6*SS); cv=cv2.resize(cv,(N,N),interpolation=cv2.INTER_AREA)
    grain=mo.fbm(N,N,seed+7,base=150,octaves=2); grain2=np.random.RandomState(seed+8).rand(N,N).astype(np.float32)
    a=np.clip(cv*(0.55+0.5*grain)*(0.75+0.35*grain2),0,1)**0.9
    col=np.dstack([np.full((N,N),v,np.float32) for v in (66,66,72)])*(0.9+0.2*grain[...,None])
    im=mo.to_img(col,a*0.95); ys,xs=np.where(np.array(im.split()[-1])>12)
    return im.crop((max(xs.min()-6,0),max(ys.min()-6,0),xs.max()+7,ys.max()+7))
spec=[('four','Starburst, Four Points'),('eight','Starburst, Eight Rays'),('twelve','Starburst, Twelve Rays'),('sixteen','Starburst, Sixteen Fine Rays'),('asterisk','Starburst, Asterisk'),('sparkle','Sparkle, Double-Lined'),('scribble','Starburst, Scribbled Centre'),('cluster','Three Small Bursts'),('radiant','Sun, With A Ring'),
      ('four','Starburst, Four Points, Again'),('eight','Starburst, Eight Rays, Loose'),('sparkle','Sparkle, Double-Lined, Again'),('twelve','Starburst, Twelve Rays, Quick'),('asterisk','Starburst, Asterisk, Again'),('cluster','Three Small Bursts, Again')]
out=[]; lines=[]
for i,(k,t) in enumerate(spec):
    im=burst(900+i*3,k,N=360 if i%3 else 480); fn='images/cutouts/pencil-%s-%02d.webp'%(k,i+1)
    im.save(R+fn,'WEBP',quality=90,method=4,alpha_quality=100); out.append(im)
    lines.append('    { id:"pencil-%s-%02d-cut", category:"cutouts", group:"paper", title:%s, image:"%s", w:%d, h:%d, alpha:true, tags:%s },'%(k,i+1,json.dumps(t+', Pencil'),fn,im.width,im.height,json.dumps(['starburst','pencil','graphite','drawing','sparkle','star'])))
open('/tmp/cs/star_lines.txt','w').write('\n'.join(lines)+'\n')
bg=Image.new('RGB',(5*260,3*260),(236,228,208)); 
for i,im in enumerate(out):
    t=im.copy(); t.thumbnail((240,240)); bg.paste(t,((i%5)*260+10,(i//5)*260+10),t)
bg.save('/tmp/cs/star_prev.png')
