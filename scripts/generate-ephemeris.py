"""Generate lazy five-year browser chunks from NASA/JPL's DE440s SPICE kernel."""
from __future__ import annotations

import json
import struct
from datetime import datetime, timedelta, timezone
from pathlib import Path

import spiceypy as spice

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "ephemeris"
KERNEL = Path("/tmp/de440s.bsp")
LEAP_SECONDS = Path("/tmp/naif0012.tls")
AU_KM = 149_597_870.700

# DE440s stores the outer planets at their system barycenters. At portfolio
# scale this is visually indistinguishable from the body center and retains
# the full JPL n-body solution.
BODIES = {
    "mercury": ("1", 1.0), "venus": ("2", 1.0), "earth": ("399", 1.0),
    "mars": ("4", 1.0), "jupiter": ("5", 1.0), "saturn": ("6", 1.0),
    "uranus": ("7", 1.0), "neptune": ("8", 1.0), "moon": ("301", 0.25),
}

if not KERNEL.exists() or not LEAP_SECONDS.exists():
    raise SystemExit("Download de440s.bsp and naif0012.tls to /tmp before generating")

OUT.mkdir(parents=True, exist_ok=True)
spice.furnsh(str(KERNEL))
spice.furnsh(str(LEAP_SECONDS))
rotation = spice.pxform("J2000", "ECLIPJ2000", 0.0)
manifest = {
    "version": 1,
    "source": "NASA/JPL DE440s SPICE, geometric heliocentric vectors, J2000 ecliptic, AU/day",
    "chunks": [],
}

for start_year in range(1950, 2051, 5):
    end_year = min(2050, start_year + 4)
    start = datetime(start_year, 1, 1, tzinfo=timezone.utc)
    stop = datetime(end_year + 1, 1, 1, tzinfo=timezone.utc)
    filename = f"{start_year}-{end_year}.bin"
    output_file = OUT / filename
    values: list[float] = []
    layouts = {}
    start_et = spice.str2et(start.strftime("%Y-%m-%d %H:%M:%S UTC"))

    for name, (target, step_days) in BODIES.items():
        count = int((stop - start).total_seconds() / 86400 / step_days) + 1
        offset = sum(layout["count"] * 6 for layout in layouts.values())
        layouts[name] = {"offset": offset, "count": count, "stepDays": step_days}
        if output_file.exists():
            continue
        for index in range(count):
            when = start + timedelta(days=index * step_days)
            et = spice.str2et(when.strftime("%Y-%m-%d %H:%M:%S UTC"))
            state, _ = spice.spkezr(target, et, "J2000", "NONE", "SUN")
            position = rotation @ state[:3]
            velocity = rotation @ state[3:]
            values.extend(float(v / AU_KM) for v in position)
            values.extend(float(v * 86400 / AU_KM) for v in velocity)

    if not output_file.exists():
        output_file.write_bytes(struct.pack(f"<{len(values)}d", *values))
    manifest["chunks"].append({
        "startYear": start_year,
        "endYear": end_year,
        "startJd": start_et / 86400 + 2451545.0,
        "startUnixMs": int(start.timestamp() * 1000),
        "file": f"/ephemeris/{filename}",
        "bodies": layouts,
    })
    print(f"ready {filename}: {output_file.stat().st_size / 1024 / 1024:.2f} MiB", flush=True)

(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
spice.kclear()
