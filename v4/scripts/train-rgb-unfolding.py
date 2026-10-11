"""Train OmniFold on the original photos as (x, y, red, green, blue) events.

Each event has fixed paired truth/reco features. Images show the conditional
weighted mean RGB in each spatial cell. Hidden truth is used for export and
diagnostics, never classifier checkpoint selection. Requires numpy, PIL, scipy,
and torch. The broad prior component provides color support beyond one photo.
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
parser.add_argument('--sigma', type=float, default=.015)
parser.add_argument('--events', type=int, default=1000000)
parser.add_argument('--steps', type=int, default=600)
parser.add_argument('--iterations', type=int, default=12)
parser.add_argument('--device', choices=['cpu', 'mps'], default='mps')
parser.add_argument('--output', default='v4/public/data/unfolding')
args = parser.parse_args()
ROOT = Path(__file__).resolve().parents[2]
N, GRID, PHOTO, SAMPLE, COLOR_BINS = args.events, 96, 192, 2048, 64
COLOR_NOISE = .045 if args.sigma <= .02 else .09
device = torch.device(args.device)
torch.set_num_threads(4)
torch.manual_seed(714)
rng = np.random.default_rng(714)


def photo(name):
    path = ROOT / 'v4/public/img/unfolding' / name
    return np.asarray(Image.open(path).convert('RGB').resize((PHOTO, PHOTO), Image.Resampling.LANCZOS), dtype='float32') / 255


source, target = photo('face2024.png'), photo('face2025.png')


def sample(image, prior=False):
    xy = rng.random((N, 2)).astype('float32')
    pixels = np.minimum(PHOTO-1, (xy * PHOTO).astype('int64'))
    rgb = image[pixels[:, 1], pixels[:, 0]].copy()
    if prior:
        # Global colors from the starting photo, independent of position, give
        # support for new hair outlines and skin/shirt regions. A small uniform
        # RGB component covers colors missing from that photo. No target colors
        # are used to construct this prior.
        broad = rng.random(N) < .55
        rgb[broad] = image.reshape(-1, 3)[rng.integers(PHOTO**2, size=broad.sum())]
        uniform = rng.random(N) < .05
        rgb[uniform] = rng.random((uniform.sum(), 3))
        rgb += rng.normal(0, .06, rgb.shape).astype('float32')
    else:
        # A narrow continuous distribution around the original pixel colors.
        rgb += rng.normal(0, .02, rgb.shape).astype('float32')
    return np.column_stack((xy, np.clip(rgb, 0, 1))).astype('float32')


def detect(events):
    reco = events.copy()
    reco[:, :2] += rng.normal(0, args.sigma, (N, 2)).astype('float32')
    reco[:, 2:] = np.clip(reco[:, 2:] + rng.normal(0, COLOR_NOISE, (N, 3)), 0, 1)
    return reco


data_truth = sample(target)
sim_truth = sample(source, prior=True)
sim_truth[1] = sim_truth[0]
data_reco, sim_reco = detect(data_truth), detect(sim_truth)


def features(events):
    values = torch.from_numpy(events)
    xy, rgb = values[:, :2], values[:, 2:]
    parts = [(xy-.5)*2, (rgb-.5)*2]
    for frequency in [1, 2, 4, 8]:
        parts += [torch.sin(2*np.pi*frequency*xy), torch.cos(2*np.pi*frequency*xy)]
    for frequency in [1, 2]:
        parts += [torch.sin(2*np.pi*frequency*rgb), torch.cos(2*np.pi*frequency*rgb)]
    return torch.cat(parts, dim=1).to(device)


class Ratio(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(33, 128), nn.SiLU(), nn.Linear(128, 128), nn.SiLU(), nn.Linear(128, 1))
        nn.init.zeros_(self.net[-1].weight)
        nn.init.zeros_(self.net[-1].bias)

    def forward(self, values):
        return self.net(values).squeeze(-1)


FT, FR, FD = features(sim_truth), features(sim_reco), features(data_reco)
validation = torch.arange(int(.8*N), N, device=device)


def fit(model, x0, x1, weights0, weights1, steps):
    w0 = torch.from_numpy((weights0/weights0.mean()).astype('float32')).to(device)
    w1 = torch.from_numpy((weights1/weights1.mean()).astype('float32')).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=.0015)
    best, best_state, patience = float('inf'), None, 0
    for step in range(steps):
        ix = torch.randint(int(.8*N), (8192,), device=device)
        loss = ((F.softplus(model(x0[ix]))*w0[ix]).mean() + (F.softplus(-model(x1[ix]))*w1[ix]).mean())/2
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        if step % 20 == 0 or step == steps-1:
            with torch.no_grad():
                vl = ((F.softplus(model(x0[validation]))*w0[validation]).mean() + (F.softplus(-model(x1[validation]))*w1[validation]).mean()).item()/2
            if vl < best-1e-5:
                best = vl
                best_state = {key: value.detach().clone() for key, value in model.state_dict().items()}
                patience = 0
            else:
                patience += 1
            if patience >= 5:
                break
    model.load_state_dict(best_state)
    with torch.no_grad():
        ratios = torch.exp(model(x0).clamp(-4, 4)).cpu().numpy()
    return ratios, {'validation_bce': round(best, 6), 'optimizer_steps': step+1}


def histogram(events, weights=None):
    if weights is None:
        weights = np.ones(N)
    histograms = []
    for component in range(4):
        w = weights if component == 0 else weights * events[:, component+1]
        h = np.histogram2d(events[:, 1], events[:, 0], bins=GRID, range=((0, 1), (0, 1)), weights=w)[0]
        histograms.append(h/N)
    return np.asarray(histograms, dtype='float32').ravel()


def color_histogram(events, weights=None):
    return np.asarray([np.histogram(events[:, c], bins=COLOR_BINS, range=(0, 1), weights=weights)[0]/N for c in [2, 3, 4]], dtype='float32').ravel()


def distance(hist, reference):
    def mean_rgb(values):
        values = gaussian_filter(values.reshape(4, GRID, GRID), (0, .8, .8))
        return values[1:] / np.maximum(values[0], 1e-10)
    return float(np.sqrt(np.square(mean_rgb(hist)-mean_rgb(reference)).mean()))


arrays, offset = [], 0


def put(values):
    global offset
    values = np.asarray(values, dtype='<f4').ravel()
    arrays.append(values)
    start = offset
    offset += len(values)
    return start


reference, measured = histogram(data_truth), histogram(data_reco)
metadata = {
    'version': 3, 'prior': 'photo-rgb', 'sigma': args.sigma, 'rgb_noise': COLOR_NOISE,
    'iterations': args.iterations, 'grid': GRID, 'channels': 4, 'color_model': 'rgb',
    'pair_stride': 10, 'color_bins': COLOR_BINS, 'sample_count': SAMPLE, 'events': N,
    'seed': 714, 'device': args.device, 'features': ['x', 'y', 'red', 'green', 'blue'],
    'source_images': ['face2024.png', 'face2025.png'],
    'method': 'two weighted neural classifiers on position and continuous RGB; held-out BCE',
    'distance_metric': 'conditional RGB RMSE after fixed spatial smoothing',
    'display_scale': 1/GRID**2, 'frames': [],
    'data': put(measured), 'reference': put(reference),
    'data_color': put(color_histogram(data_reco)), 'reference_color': put(color_histogram(data_truth)),
}
indices = np.concatenate(([0, 1], 2+np.arange(SAMPLE-2)*max(1, (N-2)//SAMPLE)))
metadata['pairs'] = put(np.column_stack((sim_truth[indices], sim_reco[indices])))


def record(truth_weights, reco_weights, iteration, beat, training=None):
    ht, hr = histogram(sim_truth, truth_weights), histogram(sim_reco, reco_weights)
    frame = {
        'iteration': iteration, 'beat': beat, 'truth': put(ht), 'reco': put(hr),
        'truth_color': put(color_histogram(sim_truth, truth_weights)),
        'reco_color': put(color_histogram(sim_reco, reco_weights)),
        'truth_weights': put(truth_weights[indices]), 'reco_weights': put(reco_weights[indices]),
        'ess': float(truth_weights.sum()**2/(np.square(truth_weights).sum()*N)),
        'reference_distance': distance(ht, reference), 'detector_distance': distance(hr, measured),
    }
    if training:
        frame['training'] = training
    metadata['frames'].append(frame)


nu, ones = np.ones(N, dtype='float32'), np.ones(N, dtype='float32')
record(nu, nu, 0, 'start')
detector, truth_model = Ratio().to(device), Ratio().to(device)
started = time.monotonic()
for iteration in range(1, args.iterations+1):
    steps = args.steps if iteration == 1 else args.steps//2
    ratio, report1 = fit(detector, FR, FD, nu, ones, steps)
    omega = nu * ratio
    omega /= omega.mean()
    record(nu, omega, iteration, 'detector', report1)
    record(omega, omega, iteration, 'pull')
    ratio, report2 = fit(truth_model, FT, FT, nu, omega, steps)
    nu *= ratio
    nu /= nu.mean()
    record(nu, nu, iteration, 'truth', report2)
    frame = metadata['frames'][-1]
    print(json.dumps({'sigma': args.sigma, 'iteration': iteration,
        'reference_rgb_rmse': round(frame['reference_distance'], 4),
        'detector_rgb_rmse': round(frame['detector_distance'], 4),
        'ess': round(frame['ess'], 3), 'seconds': round(time.monotonic()-started, 1)}), flush=True)

buffer = np.concatenate(arrays).astype('<f4').tobytes()
metadata['floats'], metadata['sha256'] = offset, hashlib.sha256(buffer).hexdigest()
output = ROOT / args.output
output.mkdir(parents=True, exist_ok=True)
name = f'photo-rgb-{round(args.sigma*1000):03d}'
(output/f'{name}.bin').write_bytes(buffer)
(output/f'{name}.json').write_text(json.dumps(metadata, separators=(',', ':')))
print('SAVED', name, len(buffer), flush=True)
