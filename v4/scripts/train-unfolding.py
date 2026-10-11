"""Train a reproducible, synthetic two-classifier OmniFold portrait demo locally.
Truth-reference coordinates are used for diagnostics/export only, never training.
Requires numpy, Pillow, scipy and torch. Run with --sigma .055 --prior photo.
"""
import argparse, json, time
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
import torch
from torch import nn
from torch.nn import functional as F

parser=argparse.ArgumentParser()
parser.add_argument('--sigma',type=float,default=.055)
parser.add_argument('--prior',choices=['photo','uniform'],default='photo')
parser.add_argument('--iterations',type=int,default=12)
parser.add_argument('--steps',type=int,default=240)
parser.add_argument('--output',default='v4/public/data/unfolding')
a=parser.parse_args()
torch.set_num_threads(4);torch.manual_seed(714)
rng=np.random.default_rng(714)
N=40000; M=64; S=2048
root=Path(__file__).resolve().parents[2]

def density(name):
    rgb=np.asarray(Image.open(root/'v4/public/img/unfolding'/name).convert('RGB').resize((128,128),Image.Resampling.LANCZOS)).astype(float)/255
    lum=rgb@np.array([.299,.587,.114]);p=np.maximum(np.clip((1-lum-.12)/.75,0,1)**1.6,.0012);return (p/p.sum()).ravel()
def sample(p):
    k=rng.choice(128**2,N,p=p);return np.column_stack(((k%128+rng.random(N))/128,(k//128+rng.random(N))/128)).astype('float32')
# Fixed seeds make the data sample and paired simulation independent of response.
data_truth=sample(density('face2025.png'))
sim_truth=sample(density('face2024.png') if a.prior=='photo' else np.ones(128**2)/128**2)
# A deliberately duplicated truth location with independent detector noise
# demonstrates why the second classifier learns a function of truth features.
sim_truth[1]=sim_truth[0]
data_reco=data_truth+rng.normal(0,a.sigma,data_truth.shape).astype('float32')
sim_reco=sim_truth+rng.normal(0,a.sigma,sim_truth.shape).astype('float32')

def features(x):
    t=torch.from_numpy(x)
    pieces=[(t-.5)*2]
    for f in [1,2,4,8]:
        pieces.extend([torch.sin(2*np.pi*f*t),torch.cos(2*np.pi*f*t)])
    return torch.cat(pieces,dim=1)
FT=features(sim_truth); FR=features(sim_reco); FD=features(data_reco)
class Ratio(nn.Module):
    def __init__(self):
        super().__init__();self.net=nn.Sequential(nn.Linear(18,64),nn.SiLU(),nn.Linear(64,64),nn.SiLU(),nn.Linear(64,1))
        nn.init.zeros_(self.net[-1].weight);nn.init.zeros_(self.net[-1].bias)
    def forward(self,x):return self.net(x).squeeze(-1)

# Fixed disjoint training/validation events; both truth-classifier copies of an
# event stay in the same split. Early stopping uses BCE, not the hidden truth.
train=torch.arange(0,32000); val=torch.arange(32000,N)
def fit(model,x0,x1,w0,w1,steps):
    w0=torch.from_numpy((w0/w0.mean()).astype('float32'))
    w1=torch.from_numpy((w1/w1.mean()).astype('float32'))
    opt=torch.optim.Adam(model.parameters(),lr=.002)
    best=float('inf');best_state=None;patience=0
    for step in range(steps):
        ix=train[torch.randint(len(train),(8192,))]
        # Each class contributes equally after weight normalization.
        loss=(F.softplus(model(x0[ix]))*w0[ix]).mean()/2+(F.softplus(-model(x1[ix]))*w1[ix]).mean()/2
        opt.zero_grad();loss.backward();opt.step()
        if step%10==0 or step==steps-1:
            with torch.no_grad():
                vl=((F.softplus(model(x0[val]))*w0[val]).mean()/2+(F.softplus(-model(x1[val]))*w1[val]).mean()/2).item()
            if vl<best-1e-5:
                best=vl;best_state={k:v.detach().clone() for k,v in model.state_dict().items()};patience=0
            else:patience+=1
            if patience>=6:break
    model.load_state_dict(best_state)
    with torch.no_grad():ratios=torch.exp(model(x0).clamp(-4,4)).numpy()
    return ratios,{'validation_bce':round(best,6),'optimizer_steps':step+1}

def hist(x,w=None):
    h=np.histogram2d(x[:,1],x[:,0],bins=M,range=((0,1),(0,1)),weights=w)[0]
    return (h/N).astype('float32').ravel()
def ess(w):return float(w.sum()**2/(np.square(w).sum()*len(w)))
ref_hist=hist(data_truth);data_hist=hist(data_reco)
def distance(h,ref):
    # Descriptive distance of smoothed, normalized display distributions.
    p=gaussian_filter(h.reshape(M,M),1).ravel();q=gaussian_filter(ref.reshape(M,M),1).ravel()
    return float(np.abs(p/p.sum()-q/q.sum()).sum()/2)
arrays=[];offset=0
def put(x):
    global offset
    v=np.asarray(x,dtype='<f4').ravel();arrays.append(v);o=offset;offset+=len(v);return o
metadata={'version':1,'sigma':a.sigma,'prior':a.prior,'iterations':a.iterations,'grid':M,'sample_count':S,'events':N,'seed':714,'method':'two weighted neural-network classifiers, Fourier features, held-out BCE early stopping','frames':[]}
metadata['data']=put(data_hist);metadata['reference']=put(ref_hist)
indices=np.concatenate(([0,1],2+np.arange(S-2)*17))
metadata['pairs']=put(np.column_stack((sim_truth[indices],sim_reco[indices])))
nu=np.ones(N,dtype='float32')
def record(truth_weights,reco_weights,k,beat,training=None):
    ht=hist(sim_truth,truth_weights);hr=hist(sim_reco,reco_weights)
    f={'iteration':k,'beat':beat,'truth':put(ht),'reco':put(hr),'truth_weights':put(truth_weights[indices]),'reco_weights':put(reco_weights[indices]),'ess':ess(truth_weights),'detector_distance':distance(hr,data_hist),'reference_distance':distance(ht,ref_hist)}
    if training:f['training']=training
    metadata['frames'].append(f)
record(nu,nu,0,'start')
detector=Ratio();truth_model=Ratio()
started=time.monotonic()
for k in range(1,a.iterations+1):
    ratio,report1=fit(detector,FR,FD,nu,np.ones(N,dtype='float32'),a.steps if k==1 else max(80,a.steps//2))
    omega=nu*ratio;omega/=omega.mean()
    record(nu,omega,k,'detector',report1)
    record(omega,omega,k,'pull')
    ratio,report2=fit(truth_model,FT,FT,nu,omega,a.steps if k==1 else max(80,a.steps//2))
    nu=nu*ratio;nu/=nu.mean()
    record(nu,nu,k,'truth',report2)
    f=metadata['frames'][-1]
    print(json.dumps({'prior':a.prior,'sigma':a.sigma,'iteration':k,'truth_distance':round(f['reference_distance'],4),'detector_distance':round(f['detector_distance'],4),'ess':round(f['ess'],3),'seconds':round(time.monotonic()-started,1)}),flush=True)
metadata['display_scale']=float(max(np.percentile(v,99) for v in arrays if len(v)==M*M))
# Buffer bounds are checked in the browser; regression tests verify the digest.
import hashlib
buffer=np.concatenate(arrays).astype('<f4').tobytes();metadata['floats']=offset;metadata['sha256']=hashlib.sha256(buffer).hexdigest()
name=f"{a.prior}-{round(a.sigma*1000):03d}"
out=root/a.output;out.mkdir(parents=True,exist_ok=True)
(out/(name+'.bin')).write_bytes(buffer)
(out/(name+'.json')).write_text(json.dumps(metadata,separators=(',',':')))
print('SAVED',name,len(buffer),flush=True)
