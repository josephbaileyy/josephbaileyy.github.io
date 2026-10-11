"""Original-color photo OmniFold with (x, y, color-channel) events.

Stratified simulation points have initial weights from the source photo plus
5% uniform support. Data events are sampled from the target intensity density.
Two classifiers learn ratios; no target truth features enter training. A third,
independent split chooses a suggested stopping point using detector discrepancy.
"""
import argparse
import hashlib
import json
import time
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
import torch
from torch import nn
from torch.nn import functional as F

parser = argparse.ArgumentParser()
parser.add_argument('--sigma', type=float, default=.040)
parser.add_argument('--steps', type=int, default=1000)
parser.add_argument('--ensemble', type=int, default=3)
parser.add_argument('--iterations', type=int, default=12)
parser.add_argument('--device', choices=['cpu', 'mps'], default='mps')
parser.add_argument('--output', default='v4/public/data/unfolding')
args = parser.parse_args()
ROOT = Path(__file__).resolve().parents[2]
GRID, DRAW, SAMPLE, REPEATS = 96, 192, 2048, 36
N = GRID**2 * 3 * REPEATS
CONFUSION = .35 if args.sigma > .02 else .15
rng = np.random.default_rng(714)
torch.manual_seed(714)
torch.set_num_threads(4)
device = torch.device(args.device)

def photo(name):
    return np.asarray(Image.open(ROOT/'v4/public/img/unfolding'/name).convert('RGB').resize((DRAW, DRAW), Image.Resampling.LANCZOS), dtype='float32').transpose(2, 0, 1)/255
source, target = photo('face2024.png'), photo('face2025.png')
# A simulated color-calibration bias gives the coupled channel response real
# work to do over multiple iterations. Target colors never define this prior.
calibrated = source * np.asarray([.80, 1., 1.20], dtype='float32')[:, None, None]
prior_density = .95*calibrated/calibrated.sum() + .05/source.size
target_density = target/target.sum()
# Equal coverage of every position/channel cell, shuffled before data splits.
indices = np.tile(np.arange(GRID**2*3), REPEATS)
rng.shuffle(indices)
spatial = indices % GRID**2
sim_truth = np.column_stack(((spatial%GRID+rng.random(N))/GRID,
    (spatial//GRID+rng.random(N))/GRID, indices//GRID**2)).astype('float32')
sim_truth[1] = sim_truth[0]
xy = np.minimum(DRAW-1, (sim_truth[:, :2]*DRAW).astype('int64'))
nu0 = (prior_density[sim_truth[:, 2].astype('int64'), xy[:, 1], xy[:, 0]]*prior_density.size).astype('float32')
nu0 /= nu0.mean()
# Measured sample has unit weights and is generated once.
indices = rng.choice(target_density.size, N, p=target_density.ravel())
spatial = indices % DRAW**2
data_truth = np.column_stack(((spatial%DRAW+rng.random(N))/DRAW,
    (spatial//DRAW+rng.random(N))/DRAW, indices//DRAW**2)).astype('float32')

def detect(events):
    reco = events.copy()
    reco[:, :2] += rng.normal(0, args.sigma, (len(events), 2)).astype('float32')
    flip = rng.random(len(events)) < CONFUSION
    reco[flip, 2] = (events[flip, 2]+rng.integers(1, 3, flip.sum()))%3
    return reco
sim_reco, data_reco = detect(sim_truth), detect(data_truth)
sim_reco[1, 2] = (sim_reco[0, 2]+1)%3

def features(events):
    xy = torch.from_numpy(events[:, :2].copy())
    parts = [(xy-.5)*2]
    for freq in [1, 2, 4, 8, 16, 32]:
        parts += [torch.sin(2*np.pi*freq*xy), torch.cos(2*np.pi*freq*xy)]
    parts.append(F.one_hot(torch.from_numpy(events[:, 2].astype('int64')), 3).float())
    return torch.cat(parts, dim=1).to(device)

class Ratio(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(29, 128), nn.SiLU(), nn.Linear(128, 128), nn.SiLU(), nn.Linear(128, 1))
        nn.init.zeros_(self.net[-1].weight)
        nn.init.zeros_(self.net[-1].bias)
    def forward(self, x):
        return self.net(x).squeeze(-1)
FT, FR, FD = features(sim_truth), features(sim_reco), features(data_reco)
train_end, checkpoint_end = int(.6*N), int(.8*N)
validation = torch.arange(train_end, checkpoint_end, device=device)

def fit_one(model, x0, x1, weights0, weights1, steps):
    w0 = torch.from_numpy((weights0/weights0.mean()).astype('float32')).to(device)
    w1 = torch.from_numpy((weights1/weights1.mean()).astype('float32')).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=.0015)
    best, best_state, patience = float('inf'), None, 0
    for step in range(steps):
        ix = torch.randint(train_end, (8192,), device=device)
        loss = ((F.softplus(model(x0[ix]))*w0[ix]).mean() + (F.softplus(-model(x1[ix]))*w1[ix]).mean())/2
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        if step%20 == 0 or step == steps-1:
            with torch.no_grad():
                vl = ((F.softplus(model(x0[validation]))*w0[validation]).mean() + (F.softplus(-model(x1[validation]))*w1[validation]).mean()).item()/2
            if vl < best-1e-5:
                best, best_state, patience = vl, {k:v.detach().clone() for k,v in model.state_dict().items()}, 0
            else:
                patience += 1
            if patience >= 6:
                break
    model.load_state_dict(best_state)
    with torch.no_grad():
        ratio = torch.cat([model(x0[start:start+100000]).clamp(-4, 4) for start in range(0, N, 100000)]).cpu().numpy()
    return ratio, {'validation_bce':round(best, 6), 'optimizer_steps':step+1}

def fit(models, x0, x1, weights0, weights1, steps):
    logits, reports = [], []
    for model in models:
        values, report = fit_one(model, x0, x1, weights0, weights1, steps)
        logits.append(values)
        reports.append(report)
    probabilities = np.mean([1/(1+np.exp(-values)) for values in logits], axis=0)
    ratio = probabilities/(1-probabilities)
    return ratio, {'ensemble':reports}

def histogram(events, weights=None, grid=GRID, bounds=(0, 1)):
    return np.asarray([np.histogram2d(events[events[:,2]==c,1], events[events[:,2]==c,0], bins=grid, range=(bounds,bounds), weights=None if weights is None else weights[events[:,2]==c])[0]/len(events) for c in range(3)], dtype='float32').ravel()

def distance(a,b):
    a = gaussian_filter(a.reshape(3,GRID,GRID),(0,.8,.8)).ravel()
    b = gaussian_filter(b.reshape(3,GRID,GRID),(0,.8,.8)).ravel()
    return float(np.abs(a/a.sum()-b/b.sum()).sum()/2)

# Fine reference is the known toy distribution integrated into display cells.
reference = target_density.reshape(3, GRID, 2, GRID, 2).sum(axis=(2,4)).astype('float32').ravel()
measured = histogram(data_reco)
# Independent detector validation includes smeared tails outside the image.
check_data = histogram(data_reco[checkpoint_end:], grid=24, bounds=(-.2,1.2))

def stopping_score(weights):
    h = histogram(sim_reco[checkpoint_end:], weights[checkpoint_end:], grid=24, bounds=(-.2,1.2))
    return float(np.abs(h/h.sum()-check_data/check_data.sum()).sum()/2)
arrays, offset = [], 0

def put(values):
    global offset
    values = np.asarray(values,dtype='<f4').ravel()
    arrays.append(values)
    start, offset = offset, offset+len(values)
    return start
metadata = {'version':2, 'prior':'photo-intensity', 'sigma':args.sigma,
    'color_confusion':CONFUSION, 'iterations':args.iterations, 'grid':GRID,
    'channels':3, 'color_model':'intensity', 'palette':['#ff0000','#00ff00','#0000ff'],
    'color_names':['Red channel','Green channel','Blue channel'], 'pair_stride':6,
    'sample_count':SAMPLE, 'events':N, 'ensemble':args.ensemble, 'seed':714, 'device':args.device,
    'features':['x','y','color channel'], 'source_images':['face2024.png','face2025.png'],
    'method':'two weighted neural classifiers on position and color channel; held-out BCE',
    'sampling':'stratified uniform simulation with source intensity initial weights and 5% uniform support',
    'prior_channel_gains':[.80, 1., 1.20],
    'distance_metric':'smoothed joint position/channel total variation',
    'display_scale':1/(GRID**2*float(source.sum()/DRAW**2)),
    'frames':[], 'data':put(measured),'reference':put(reference)}
indices = np.concatenate(([0,1],2+np.arange(SAMPLE-2)*max(1,(N-2)//SAMPLE)))
metadata['pairs'] = put(np.column_stack((sim_truth[indices],sim_reco[indices])))

def record(truth_weights,reco_weights,iteration,beat,training=None):
    ht,hr = histogram(sim_truth,truth_weights),histogram(sim_reco,reco_weights)
    frame = {'iteration':iteration,'beat':beat,'truth':put(ht),'reco':put(hr),
        'truth_weights':put(truth_weights[indices]),'reco_weights':put(reco_weights[indices]),
        'ess':float(truth_weights.sum()**2/(np.square(truth_weights).sum()*N)),
        'reference_distance':distance(ht,reference),'detector_distance':distance(hr,measured)}
    if beat in ['start','truth']:
        frame['stopping_score'] = stopping_score(reco_weights)
    if training:
        frame['training'] = training
    metadata['frames'].append(frame)
nu,ones = nu0.copy(),np.ones(N,dtype='float32')
record(nu,nu,0,'start')
detector = [Ratio().to(device) for _ in range(args.ensemble)]
truth_model = [Ratio().to(device) for _ in range(args.ensemble)]
started = time.monotonic()
for iteration in range(1,args.iterations+1):
    steps = args.steps if iteration==1 else args.steps//2
    ratio,report1 = fit(detector,FR,FD,nu,ones,steps)
    omega = nu*ratio
    omega /= omega.mean()
    record(nu,omega,iteration,'detector',report1)
    record(omega,omega,iteration,'pull')
    ratio,report2 = fit(truth_model,FT,FT,nu,omega,steps)
    nu *= ratio
    nu /= nu.mean()
    record(nu,nu,iteration,'truth',report2)
    f = metadata['frames'][-1]
    print(json.dumps({'sigma':args.sigma,'iteration':iteration,'truth_tv':round(f['reference_distance'],4),'check_tv':round(f['stopping_score'],4),'ess':round(f['ess'],3),'seconds':round(time.monotonic()-started,1)}),flush=True)
# Earliest completed iteration within a predeclared .002 TV tolerance of the
# minimum independent detector score; hidden truth never determines stopping.
completed = metadata['frames'][3::3]
best = min(f['stopping_score'] for f in completed)
metadata['recommended_iteration'] = next(f['iteration'] for f in completed if f['stopping_score'] <= best+.002)
metadata['stopping_rule'] = {'metric':'independent detector joint TV in 24x24x3 cells including tails','tolerance':.002,'training_fraction':.6,'checkpoint_fraction':.2,'stopping_fraction':.2}
buffer = np.concatenate(arrays).astype('<f4').tobytes()
metadata['floats'],metadata['sha256'] = offset,hashlib.sha256(buffer).hexdigest()
output = ROOT/args.output
output.mkdir(parents=True,exist_ok=True)
name = f'photo-intensity-{round(args.sigma*1000):03d}'
(output/f'{name}.bin').write_bytes(buffer)
(output/f'{name}.json').write_text(json.dumps(metadata,separators=(',',':')))
print('SAVED',name,'suggested stop',metadata['recommended_iteration'],flush=True)
