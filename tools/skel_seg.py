import numpy as np, cv2, json, sys
A='/mnt/user-data/attachments/a51ce13b-e88e-5c56-9d77-f6f1d1200f48/'
fs=['a748ef79','5443d05b','878e399d','b2d1dc66','d26ad24b','e91631e7','e63c1139','b4d979ae']
def comps(i):
    im=cv2.imread(A+fs[i-1]+'-image.png'); g8=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY); g=g8.astype(np.float32)
    bg=cv2.medianBlur(cv2.resize(g8,None,fx=.25,fy=.25),31).astype(np.float32); bg=cv2.resize(bg,(g.shape[1],g.shape[0]))
    ink=((bg-g)>55).astype(np.uint8)*255
    sc=max(im.shape)/1200
    k=int(round(5*sc))|1
    d=cv2.dilate(ink,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k,k)))
    n,lab,st,_=cv2.connectedComponentsWithStats(d,8)
    out=[]
    for j in range(1,n):
        x,y,w,h,a=st[j]
        if w>=35*sc and h>=35*sc and a>400*sc*sc: out.append((j,x,y,w,h))
    return im,lab,out,sc,k
if __name__=='__main__':
    for i in range(1,9):
        if i==4: continue
        im,lab,out,sc,k=comps(i); print(i,len(out))
        v=im.copy()
        for j,x,y,w,h in out:
            cv2.rectangle(v,(x,y),(x+w,y+h),(0,0,255),max(2,int(3*sc)))
            cv2.putText(v,str(j),(x+4,y+int(30*sc)),cv2.FONT_HERSHEY_SIMPLEX,1.0*sc,(255,0,0),max(2,int(3*sc)))
        s=1500/max(v.shape); v=cv2.resize(v,None,fx=s,fy=s,interpolation=cv2.INTER_AREA); cv2.imwrite(f'seg{i}.jpg',v)
