"""Reproducible position-and-color OmniFold toy, trained on synthetic events.

The hidden reference is only used for exported diagnostics. Both classifiers
see event features, never image bins. Requires numpy, Pillow, scipy, and torch.
"""

import argparse
import hashlib
import json
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, shift
import torch
from torch import nn
from torch.nn import functional as F


parser = argparse.ArgumentParser()
parser.add_argument('--sigma', type=float, default=.040)
parser.add_argument('--prior', choices=['hurdler', 'flat'], default='hurdler')
parser.add_argument('--iterations', type=int, default=12)
parser.add_argument('--steps', type=int, default=360)
parser.add_argument('--events', type=int, default=100000)
parser.add_argument('--output', default='v4/public/data/unfolding')
args = parser.parse_args()
torch.set_num_threads(4)
torch.manual_seed(714)
rng = np.random.default_rng(714)
ROOT = Path(__file__).resolve().parents[2]
N, GRID, DRAW, SAMPLE = args.events, 96, 192, 2048
PALETTE = ['#3d5744', '#b4664a', '#b69346']
CONFUSION = .20 if args.sigma > .02 else .08


def illustration():
    """Broad strokes form an athlete clearing an ochre hurdle. No photo assets."""
    image = Image.new('RGB', (DRAW, DRAW), (0, 0, 0))
    draw = ImageDraw.Draw(image)
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255)]

    def line(points, width, color):
        points = [(round(x * DRAW), round(y * DRAW)) for x, y in points]
        width = round(width * DRAW)
        draw.line(points, fill=colors[color], width=width, joint='curve')
        radius = width / 2
        for x, y in points:
            draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=colors[color])

    # Hurdle, head, torso, two arms, and the extended/folded legs.
    line([(.59, .67), (.90, .67)], .038, 2)
    line([(.65, .69), (.65, .87)], .030, 2)
    line([(.84, .69), (.84, .87)], .030, 2)
    line([(.60, .88), (.70, .88)], .026, 2)
    line([(.79, .88), (.89, .88)], .026, 2)
    draw.ellipse((.445*DRAW, .16*DRAW, .575*DRAW, .29*DRAW), fill=colors[0])
    line([(.49, .33), (.405, .465)], .098, 0)
    line([(.485, .345), (.625, .39), (.71, .32)], .048, 1)
    line([(.455, .35), (.32, .37), (.25, .29)], .048, 1)
    line([(.42, .47), (.62, .48), (.82, .57)], .062, 0)
    line([(.40, .47), (.27, .61), (.16, .52)], .060, 1)
    line([(.81, .57), (.87, .575)], .038, 0)
    line([(.16, .52), (.12, .49)], .038, 1)
    masks = np.asarray(image).transpose(2, 0, 1) / 255.
    # Tiny full-support component: weights cannot create absent event features.
    truth = masks + .002
    truth /= truth.sum()
    if args.prior == 'flat':
        prior = np.full_like(truth, 1 / truth.size)
    else:
        # A broader, shifted, wrongly colored starting simulation. Its support
        # overlaps truth; this is a different joint distribution, not a morph.
        displaced = np.stack([
            shift(gaussian_filter(masks[(c + 1) % 3], 4), (9, -13), order=1)
            for c in range(3)
        ])
        displaced += .008
        displaced /= displaced.sum()
        prior = .25 * truth + .75 * displaced
    return truth, prior


def sample(density):
    indices = rng.choice(density.size, N, p=density.ravel())
    colors = indices // (DRAW * DRAW)
    spatial = indices % (DRAW * DRAW)
    return np.column_stack((
        (spatial % DRAW + rng.random(N)) / DRAW,
        (spatial // DRAW + rng.random(N)) / DRAW,
        colors,
    )).astype('float32')


def detect(events):
    reco = events.copy()
    reco[:, :2] += rng.normal(0, args.sigma, (N, 2)).astype('float32')
    flips = rng.random(N) < CONFUSION
    alternatives = rng.integers(1, 3, N)
    reco[flips, 2] = (events[flips, 2] + alternatives[flips]) % 3
    return reco


truth_density, prior_density = illustration()
data_truth = sample(truth_density)
sim_truth = sample(prior_density)
sim_truth[1] = sim_truth[0]
data_reco = detect(data_truth)
sim_reco = detect(sim_truth)
# Identical truth features but visibly different detector colors for two pairs.
# These illustrative detector draws follow the same allowed response outcomes.
sim_reco[1, 2] = (sim_reco[0, 2] + 1) % 3


def features(events):
    xy = torch.from_numpy(events[:, :2].copy())
    parts = [(xy - .5) * 2]
    for frequency in [1, 2, 4, 8]:
        parts += [torch.sin(2*np.pi*frequency*xy), torch.cos(2*np.pi*frequency*xy)]
    parts.append(F.one_hot(torch.from_numpy(events[:, 2].astype('int64')), 3).float())
    return torch.cat(parts, dim=1)


class Ratio(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(21, 96), nn.SiLU(), nn.Linear(96, 96), nn.SiLU(), nn.Linear(96, 1)
        )
        nn.init.zeros_(self.net[-1].weight)
        nn.init.zeros_(self.net[-1].bias)

    def forward(self, inputs):
        return self.net(inputs).squeeze(-1)


train = torch.arange(int(.8 * N))
validation = torch.arange(int(.8 * N), N)
FT, FR, FD = features(sim_truth), features(sim_reco), features(data_reco)


def fit(model, x0, x1, weights0, weights1, steps):
    w0 = torch.from_numpy((weights0 / weights0.mean()).astype('float32'))
    w1 = torch.from_numpy((weights1 / weights1.mean()).astype('float32'))
    optimizer = torch.optim.Adam(model.parameters(), lr=.002)
    best, best_state, patience = float('inf'), None, 0
    for step in range(steps):
        ix = train[torch.randint(len(train), (8192,))]
        loss = ((F.softplus(model(x0[ix])) * w0[ix]).mean()
                + (F.softplus(-model(x1[ix])) * w1[ix]).mean()) / 2
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        if step % 10 == 0 or step == steps-1:
            with torch.no_grad():
                vl = ((F.softplus(model(x0[validation])) * w0[validation]).mean()
                      + (F.softplus(-model(x1[validation])) * w1[validation]).mean()).item()/2
            if vl < best - 1e-5:
                best = vl
                best_state = {key: value.detach().clone() for key, value in model.state_dict().items()}
                patience = 0
            else:
                patience += 1
            if patience >= 6:
                break
    model.load_state_dict(best_state)
    with torch.no_grad():
        ratios = torch.exp(model(x0).clamp(-4, 4)).numpy()
    return ratios, {'validation_bce': round(best, 6), 'optimizer_steps': step+1}


def histogram(events, weights=None):
    histograms = []
    for color in range(3):
        selected = events[:, 2] == color
        h = np.histogram2d(
            events[selected, 1], events[selected, 0], bins=GRID, range=((0, 1), (0, 1)),
            weights=None if weights is None else weights[selected]
        )[0]
        histograms.append(h / N)
    return np.asarray(histograms, dtype='float32').ravel()


def distance(hist, reference):
    p = gaussian_filter(hist.reshape(3, GRID, GRID), (0, 1, 1)).ravel()
    q = gaussian_filter(reference.reshape(3, GRID, GRID), (0, 1, 1)).ravel()
    return float(np.abs(p/p.sum() - q/q.sum()).sum()/2)


arrays, offset = [], 0


def put(values):
    global offset
    values = np.asarray(values, dtype='<f4').ravel()
    arrays.append(values)
    start = offset
    offset += len(values)
    return start


reference = histogram(data_truth)
measured = histogram(data_reco)
metadata = {
    'version': 2, 'sigma': args.sigma, 'color_confusion': CONFUSION, 'prior': args.prior,
    'iterations': args.iterations, 'grid': GRID, 'channels': 3, 'palette': PALETTE,
    'color_names': ['Forest green', 'Terracotta', 'Ochre'], 'pair_stride': 6,
    'sample_count': SAMPLE, 'events': N, 'seed': 714,
    'method': 'two weighted neural classifiers on position and categorical color; held-out BCE',
    'display_scale': .0007, 'frames': [],
    'data': put(measured), 'reference': put(reference),
}
indices = np.concatenate(([0, 1], 2 + np.arange(SAMPLE-2)*max(1, (N-2)//SAMPLE)))
metadata['pairs'] = put(np.column_stack((sim_truth[indices], sim_reco[indices])))


def record(truth_weights, reco_weights, iteration, beat, training=None):
    ht = histogram(sim_truth, truth_weights)
    hr = histogram(sim_reco, reco_weights)
    frame = {
        'iteration': iteration, 'beat': beat, 'truth': put(ht), 'reco': put(hr),
        'truth_weights': put(truth_weights[indices]), 'reco_weights': put(reco_weights[indices]),
        'ess': float(truth_weights.sum()**2 / (np.square(truth_weights).sum()*N)),
        'detector_distance': distance(hr, measured), 'reference_distance': distance(ht, reference),
        'truth_color_mass': ht.reshape(3, -1).sum(axis=1).tolist(),
    }
    if training:
        frame['training'] = training
    metadata['frames'].append(frame)


nu = np.ones(N, dtype='float32')
ones = nu.copy()
record(nu, nu, 0, 'start')
detector, truth_model = Ratio(), Ratio()
started = time.monotonic()
for iteration in range(1, args.iterations+1):
    steps = args.steps if iteration == 1 else max(100, args.steps//2)
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
    print(json.dumps({
        'prior': args.prior, 'sigma': args.sigma, 'iteration': iteration,
        'truth_distance': round(frame['reference_distance'], 4),
        'detector_distance': round(frame['detector_distance'], 4),
        'seconds': round(time.monotonic()-started, 1),
    }), flush=True)

buffer = np.concatenate(arrays).astype('<f4').tobytes()
metadata['floats'] = offset
metadata['sha256'] = hashlib.sha256(buffer).hexdigest()
name = f'{args.prior}-{round(args.sigma*1000):03d}'
output = ROOT / args.output
output.mkdir(parents=True, exist_ok=True)
(output / f'{name}.bin').write_bytes(buffer)
(output / f'{name}.json').write_text(json.dumps(metadata, separators=(',', ':')))
print('SAVED', name, len(buffer), flush=True)
