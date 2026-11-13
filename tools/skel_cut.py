import numpy as np, cv2, os, json
from seg import comps, A, fs
def fill_holes(m,maxfrac=None):
    h,w=m.shape; inv=255-m; pad=cv2.copyMakeBorder(inv,1,1,1,1,cv2.BORDER_CONSTANT,value=255)
    ff=pad.copy(); mk=np.zeros((h+4,w+4),np.uint8); cv2.floodFill(ff,mk,(0,0),0)
    holes=ff[1:-1,1:-1]
    if maxfrac:
        ys,xs=np.where(m>0); area=(ys.max()-ys.min()+1)*(xs.max()-xs.min()+1)
        n,l,st,_=cv2.connectedComponentsWithStats(holes,8)
        for q in range(1,n):
            if st[q,4]>maxfrac*area: holes[l==q]=0
    return m|holes
def cutcomp(im,lab,j,sc,box=None,keepfrac=0.025):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
    bg=cv2.resize(cv2.medianBlur(cv2.resize(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY),None,fx=.25,fy=.25),31),(g.shape[1],g.shape[0])).astype(np.float32)
    ink=((bg-g)>55).astype(np.uint8)*255
    region=(lab==j).astype(np.uint8)*255 if box is None else None
    if box is not None:
        region=np.zeros_like(ink); x0,y0,x1,y1=box; region[y0:y1,x0:x1]=255
    ink=cv2.bitwise_and(ink,region)
    k3=max(3,int(3*sc))|1
    d=cv2.dilate(ink,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k3,k3)))
    n,l2,st,_=cv2.connectedComponentsWithStats(d,8)
    if n<2: return None
    big=st[1:,4].max(); keep=np.zeros_like(ink)
    bigi=1+int(np.argmax(st[1:,4]))
    hull=fill_holes(cv2.morphologyEx((l2==bigi).astype(np.uint8)*255,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(15*sc)|1,)*2)))
    for q in range(1,n):
        x,y,w,h,a=st[q]
        inside=hull[y:y+h,x:x+w].mean()>200 if q!=bigi else True
        if a>=keepfrac*big or inside: keep[l2==q]=255
    keep=cv2.bitwise_and(keep,cv2.dilate(ink,np.ones((1,1),np.uint8)))|cv2.bitwise_and(ink,cv2.dilate(keep,np.ones((3,3),np.uint8)))
    kk=int(9*sc)|1
    m=cv2.morphologyEx(keep,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(kk,kk)))
    m=fill_holes(m,0.012); m=cv2.dilate(m,np.ones((3,3),np.uint8))
    # orange -> bone white
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV); org=(hsv[...,1]>55)&(hsv[...,0]>5)&(hsv[...,0]<25)&(hsv[...,2]>150)
    out=im.copy(); out[org&(m>0)]=(236,240,246)
    a=cv2.GaussianBlur(m,(0,0),0.8)
    ys,xs=np.where(m>0); x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
    rgba=np.dstack([out,a])[y0:y1,x0:x1]
    return rgba
if __name__=='__main__':
    import sys
    os.makedirs('parts',exist_ok=True); meta={}
    for i in [1,2,3,5,6,7,8]:
        im,lab,out,sc,k=comps(i)
        for j,x,y,w,h in out:
            r=cutcomp(im,lab,j,sc)
            if r is None: continue
            cv2.imwrite(f'parts/s{i}_{j}.png',r)
        # contact
        import glob
        fl=sorted(glob.glob(f'parts/s{i}_*.png'),key=lambda f:int(f.split('_')[1][:-4]))
        cell=260; cols=6; rows=(len(fl)+cols-1)//cols
        sheet=np.full((rows*cell,cols*cell,3),(90,120,100),np.uint8)
        for q,f in enumerate(fl):
            p=cv2.imread(f,cv2.IMREAD_UNCHANGED); s=min((cell-10)/p.shape[1],(cell-30)/p.shape[0]); p=cv2.resize(p,None,fx=s,fy=s,interpolation=cv2.INTER_AREA)
            a=p[...,3:4]/255.; ox,oy=(q%cols)*cell+5,(q//cols)*cell+22
            roi=sheet[oy:oy+p.shape[0],ox:ox+p.shape[1]]; roi[:]=(p[...,:3]*a+roi*(1-a)).astype(np.uint8)
            cv2.putText(sheet,f.split('_')[1][:-4],(ox,oy-6),cv2.FONT_HERSHEY_SIMPLEX,.6,(255,255,255),2)
        cv2.imwrite(f'contact{i}.jpg',sheet)
