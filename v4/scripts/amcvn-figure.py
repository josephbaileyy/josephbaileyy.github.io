"""Redraw the AM CVn light curve for the website (public/img/home/amcvn-fit.png).

Usage: python amcvn-figure.py <differential_light_curve.csv> <out.png>
The CSV is analysis/am_cvn/photometry/sequence_X42421BZ/differential_light_curve.csv
in the ph100-delta-scutis project. Needs numpy, pandas, matplotlib, fontTools, brotli.

Reproduces the 'free double wave' fit from ph100-delta-scutis
(src/amcvn/stacked_model_fits.py + physical_model_suite.py): weighted linear
least squares of a constant + fundamental + first harmonic, with the period
fixed at the report value of 1050.05 s. Error bars are scaled by
sqrt(reduced chi2) of that fit, as in the original figure.
"""
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
import numpy as np
import pandas as pd

csv, out = sys.argv[1], sys.argv[2]
here = Path(__file__).parent

diff = pd.read_csv(csv)
good = diff[diff.good.astype(bool) & np.isfinite(diff.diff_flux_norm)].sort_values("jd")
median_diff = float(np.nanmedian(good.diff_flux.to_numpy(float)))
t = (good.jd.to_numpy(float) - good.jd.min()) * 24 * 60
y = good.diff_flux_norm.to_numpy(float)
s = good.diff_flux_err.to_numpy(float) / median_diff
ok = np.isfinite(t) & np.isfinite(y) & np.isfinite(s) & (s > 0)
t, y, s = t[ok], y[ok], s[ok]


def design(tt, period):
    cols = [np.ones(len(tt))]
    for h in (1, 2):
        ph = 2 * np.pi * h * tt / period
        cols += [np.sin(ph), np.cos(ph)]
    return np.column_stack(cols)


# The chi-square surface is flat between ~1050 and ~1055 s; the submitted report
# quotes the free double-wave period as 1050.05 +/- 6.7 s, so draw the fit there.
period = 1050.05 / 60
x = design(t, period)
beta = np.linalg.lstsq(x / s[:, None], y / s, rcond=None)[0]
chi2 = float(np.sum(((y - x @ beta) / s) ** 2))
dof = len(t) - 5
scale = np.sqrt(chi2 / dof)
print(f"N={len(t)} P={period*60:.2f} s chi2/dof={chi2:.1f}/{dof}")

# Use the site's Inter font, instanced from the variable WOFF2 at two weights.
import tempfile
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

woff2 = here.parent / "public/fonts/inter-variable.woff2"
tmp = Path(tempfile.mkdtemp())
for w in (400, 500):
    font = instantiateVariableFont(TTFont(woff2), {"wght": w, "opsz": 14})
    font.flavor = None
    font.save(tmp / f"inter-{w}.ttf")
    font_manager.fontManager.addfont(str(tmp / f"inter-{w}.ttf"))
ink, secondary, rule, accent, bg = "#1b1b1a", "#62605a", "#dedbd3", "#3d5744", "#f9f8f3"
plt.rcParams.update({
    "font.family": "Inter", "font.size": 13, "axes.edgecolor": rule,
    "axes.labelcolor": secondary, "xtick.color": secondary, "ytick.color": secondary,
    "xtick.major.size": 0, "ytick.major.size": 0,
})

fig, ax = plt.subplots(figsize=(11.8, 3.3), dpi=200)
fig.patch.set_facecolor(bg)
ax.set_facecolor(bg)
for side in ("top", "right", "left"):
    ax.spines[side].set_visible(False)
ax.grid(axis="y", color=rule, lw=0.8)
ax.set_axisbelow(True)

ax.errorbar(t, 100 * (y - 1), yerr=100 * s * scale, fmt="o", ms=3.2,
            color=ink, mec="none", ecolor="#cfcbc1", elinewidth=0.9, capsize=0, zorder=2)
grid = np.linspace(t.min(), t.max(), 1500)
ax.plot(grid, 100 * (design(grid, period) @ beta - 1), color=accent, lw=2.2, zorder=3)

ax.set_xlim(t.min() - 1.5, t.max() + 1.5)
ax.set_xlabel("Minutes from first exposure", labelpad=6)
ax.set_ylabel("Brightness change (%)", labelpad=6)
ax.text(0.995, 1.02, "Double-wave fit, period 1050 ± 7 s",
        transform=ax.transAxes, ha="right", va="bottom", color=accent, fontsize=12.5, fontweight=500)
fig.tight_layout(pad=0.6)
fig.savefig(out, facecolor=bg)
