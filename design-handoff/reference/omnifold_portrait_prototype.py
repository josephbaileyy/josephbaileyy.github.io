import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter
rng=np.random.default_rng(3)
G=128
def dens(f,floor):
    a=np.asarray(Image.open(f).convert('RGB').resize((G,G),Image.LANCZOS)).astype(float)/255
    L=0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2]
    T=np.clip((1-L-0.12)/0.75,0,1)**1.6; T=np.maximum(T,floor); return T/T.sum()
T25=dens('face2025.png',0.0012); T24=dens('face2024.png',0.0012)
def sample(T,n):
    idx=rng.choice(G*G,size=n,p=T.ravel()); return (idx%G+rng.random(n))/G,(idx//G+rng.random(n))/G
sig=0.015
Nd=60000; tx,ty=sample(T25,Nd); rx=tx+rng.normal(0,sig,Nd); ry=ty+rng.normal(0,sig,Nd)
def mksim(T,n):
    sx,sy=sample(T,n); return sx,sy,sx+rng.normal(0,sig,n),sy+rng.normal(0,sig,n)
B=128;LO=-0.15;SP=1.3;h=0.8
def bins(x,y):
    j=np.clip(((x-LO)/SP*B).astype(int),0,B-1); i=np.clip(((y-LO)/SP*B).astype(int),0,B-1); return i*B+j
def hist(b,w): return gaussian_filter(np.bincount(b,weights=w,minlength=B*B).reshape(B,B),h).ravel()
Dh=hist(bins(rx,ry),np.ones(Nd)/Nd)
def omnifold(sim,its):
    stx,sty,srx,sry=sim; n=len(stx); rb=bins(srx,sry); tb=bins(stx,sty)
    nu=np.ones(n)*Nd/n; out={0:nu.copy()}
    for it in range(1,its+1):
        Sh=hist(rb,nu)/nu.sum()
        w=nu*Dh[rb]/np.maximum(Sh[rb],1e-15)/ (Dh.sum()/1)  # ratio
        Hw=hist(tb,w); Hn=hist(tb,nu)
        nu=nu*(Hw[tb]/np.maximum(Hn[tb],1e-15))
        nu*=Nd/nu.sum()
        out[it]=nu.copy()
    return out
M=96
def render(sim,nu,title,ref=None):
    stx,sty=sim[0],sim[1]
    H=np.bincount((np.clip((sty*M).astype(int),0,M-1))*M+np.clip((stx*M).astype(int),0,M-1),weights=nu,minlength=M*M)
    if ref is None: ref=np.percentile(H,98)
    S=300;c=Image.new('RGB',(S,S+16),'#EEEFE8');d=ImageDraw.Draw(c);s=S/M
    for k,v in enumerate(H):
        v=min(v/ref,1)
        if v<0.05: continue
        r=s*0.62*v**0.5;x=(k%M+.5)*s;y=(k//M+.5)*s;d.ellipse([x-r,y-r,x+r,y+r],fill='#1E2420')
    ess=nu.sum()**2/(nu**2).sum()/len(nu)
    d.text((4,S+2),f'{title} ESS={ess:.2f}',fill='black');return c,ref
sim24=mksim(T24,120000)
o=omnifold(sim24,30)
ref=None;pan=[]
for it in [0,3,8]:
    p,r=render(sim24,o[it],f'2024 prior it{it}',None); pan.append(p)
U=np.ones((G,G))/G/G; simU=mksim(U,120000); oU=omnifold(simU,8)
for it in [3,8]:
    p,r=render(simU,oU[it],f'uniform it{it}',None); pan.append(p)
# truth
tH=np.bincount(np.clip((ty*M).astype(int),0,M-1)*M+np.clip((tx*M).astype(int),0,M-1),minlength=M*M).astype(float)
p,_=render((tx,ty),np.ones(Nd),'truth 2025'); pan.append(p)
W=Image.new('RGB',(900,632),'white')
for k,p in enumerate(pan): W.paste(p,((k%3)*300,(k//3)*316))
W.save('proto5.png')
