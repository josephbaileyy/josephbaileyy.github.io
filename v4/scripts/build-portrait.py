#!/usr/bin/env python3
"""Manual, offline-at-runtime portrait asset bake.

This script is never called by the site build or browser runtime. Run it manually:
    python3.12 v4/scripts/build-portrait.py

The first run may download the exactly pinned model revision into Hugging Face's
user cache (outside v4/). Later runs can use that cache without network access.
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import random
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from scipy import ndimage
from transformers import AutoImageProcessor, AutoModelForDepthEstimation


REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = REPO_ROOT / "v4" / "assets-src"
OUTPUT_DIR = REPO_ROOT / "v4" / "public" / "img" / "portrait"

MODEL_ID = "depth-anything/Depth-Anything-V2-Base-hf"
MODEL_REVISION = "b1958afc87fb45a9e3746cb387596094de553ed8"
MODEL_LICENSE = "Apache-2.0"
MODEL_WEIGHTS_DOWNLOAD_BYTES = 389_916_980
BAKE_DATE = "2026-07-28"
SEED = 20260728

# Depth Anything V2 predicts relative inverse depth: larger values are nearer.
# The exported map therefore uses near=65535 (bright), far/background=0 (dark).
DEPTH_CONVENTION = (
    "relative inverse depth; near=bright (65535), far/background=dark (0)"
)
DEPTH_FAR_PERCENTILE = 1.0
DEPTH_NEAR_PERCENTILE = 99.0

# Both output tiers use the same head-and-shoulders square composition. Normalise
# on the opaque central face, excluding the hair, ears, and shoulders that
# otherwise consume most of the relative-depth range.
FACE_FOCUS_REGION = (0.38, 0.28, 0.62, 0.59)

# Reproducible acceptance measurements: the head rectangle is masked by the
# subject matte, and the centre trace runs from the crown through the jaw.
HEAD_MEASUREMENT_REGION = (0.18, 0.03, 0.82, 0.63)
PROFILE_X_FRACTION = 0.5
PROFILE_Y_FRACTIONS = tuple(
    y / 1024.0 for y in (80, 140, 200, 260, 310, 350, 390, 430, 470, 510, 570, 630)
)


@dataclass(frozen=True)
class Tier:
    source: str
    long_edge: int
    suffix: str
    colour_budget: int


TIERS = (
    Tier("portrait-square.jpg", 1024, "", 195_000),
    Tier("portrait-square.jpg", 512, "-512", 80_000),
)


def configure_determinism() -> None:
    """Force repeatable CPU inference and image processing."""
    os.environ["PYTHONHASHSEED"] = str(SEED)
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)


def target_size(width: int, height: int, long_edge: int) -> tuple[int, int]:
    scale = long_edge / max(width, height)
    return round(width * scale), round(height * scale)


def resize_source(source_path: Path, long_edge: int) -> Image.Image:
    with Image.open(source_path) as source:
        source = source.convert("RGB")
        size = target_size(*source.size, long_edge)
        return source.resize(size, Image.Resampling.LANCZOS)


def estimate_matte(image: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    """Extract a soft subject matte from the connected white studio background.

    A border-connected flood fill separates the seamless from the subject. The
    two-pixel transition is then solved against the measured white background
    and the nearest opaque foreground colour, retaining fine dark hair strands
    while decontaminating their RGB values to avoid a white fringe.
    """
    rgb = np.asarray(image, dtype=np.float32) / 255.0
    height, width, _ = rgb.shape

    border = np.concatenate(
        (rgb[0, :, :], rgb[-1, :, :], rgb[:, 0, :], rgb[:, -1, :]), axis=0
    )
    background_colour = np.median(border, axis=0)
    colour_delta = np.max(np.abs(rgb - background_colour), axis=2)

    # Pixels within ~9/255 of the measured seamless can connect to the border.
    background_passable = colour_delta < (9.0 / 255.0)
    border_seed = np.zeros((height, width), dtype=bool)
    border_seed[0, :] = background_passable[0, :]
    border_seed[-1, :] = background_passable[-1, :]
    border_seed[:, 0] = background_passable[:, 0]
    border_seed[:, -1] = background_passable[:, -1]
    connected_background = ndimage.binary_propagation(
        border_seed, mask=background_passable
    )

    # Curls can enclose tiny islands of seamless that are topologically cut off
    # from the border. Treat near-silhouette white islands as background, while
    # preserving interior whites (teeth and garment marks) farther into subject.
    distance_from_exterior = ndimage.distance_transform_edt(~connected_background)
    near_silhouette_white = background_passable & (distance_from_exterior <= 24.0)
    foreground = ~(connected_background | near_silhouette_white)

    labels, component_count = ndimage.label(foreground)
    if component_count == 0:
        raise RuntimeError("Matte extraction found no foreground component")
    component_sizes = np.bincount(labels.ravel())
    component_sizes[0] = 0
    main_component = labels == int(component_sizes.argmax())
    distance_from_main = ndimage.distance_transform_edt(~main_component)
    # Retain small detached flyaway components when they are close to the head.
    nearby_components = (
        (labels > 0)
        & (component_sizes[labels] >= 3)
        & (distance_from_main <= 24.0)
    )
    foreground = main_component | nearby_components

    opaque_core = ndimage.binary_erosion(foreground, iterations=2)
    if not opaque_core.any():
        raise RuntimeError("Matte extraction produced no opaque subject core")

    # Locate the nearest confident foreground colour for each transition pixel.
    _, nearest = ndimage.distance_transform_edt(
        ~opaque_core, return_distances=True, return_indices=True
    )
    nearest_foreground = rgb[nearest[0], nearest[1]]
    bg = background_colour.reshape(1, 1, 3)
    foreground_vector = nearest_foreground - bg
    observed_vector = rgb - bg
    denominator = np.sum(foreground_vector * foreground_vector, axis=2)
    solved_alpha = np.sum(observed_vector * foreground_vector, axis=2) / np.maximum(
        denominator, 1e-6
    )
    solved_alpha = np.clip(solved_alpha, 0.0, 1.0)

    alpha = np.zeros((height, width), dtype=np.float32)
    alpha[foreground] = solved_alpha[foreground]
    alpha[opaque_core] = 1.0
    alpha = ndimage.gaussian_filter(alpha, sigma=0.35, mode="nearest")
    alpha[alpha < (0.5 / 255.0)] = 0.0
    alpha = np.clip(alpha, 0.0, 1.0)

    # Remove the white-seamless contribution from partially transparent pixels.
    clean_rgb = np.zeros_like(rgb)
    visible = alpha > (0.5 / 255.0)
    clean_rgb[visible] = np.clip(
        (
            rgb[visible]
            - (1.0 - alpha[visible, np.newaxis]) * background_colour
        )
        / alpha[visible, np.newaxis],
        0.0,
        1.0,
    )
    clean_rgb[alpha >= (254.5 / 255.0)] = rgb[alpha >= (254.5 / 255.0)]

    matte = np.rint(alpha * 255.0).astype(np.uint8)
    clean_rgb_u8 = np.rint(clean_rgb * 255.0).astype(np.uint8)
    return matte, clean_rgb_u8


def infer_depth(
    image: Image.Image,
    processor: AutoImageProcessor,
    model: AutoModelForDepthEstimation,
) -> np.ndarray:
    inputs = processor(images=image, return_tensors="pt")
    with torch.inference_mode():
        prediction = model(**inputs).predicted_depth.unsqueeze(1)
    prediction = torch.nn.functional.interpolate(
        prediction,
        size=(image.height, image.width),
        mode="bicubic",
        align_corners=False,
    )
    return prediction.squeeze().cpu().numpy().astype(np.float32)


def region_bounds(
    region: tuple[float, float, float, float], width: int, height: int
) -> tuple[int, int, int, int]:
    left, top, right, bottom = region
    return (
        round(left * width),
        round(top * height),
        round(right * width),
        round(bottom * height),
    )


def region_metadata(
    region: tuple[float, float, float, float],
) -> dict[str, float]:
    left, top, right, bottom = region
    return {"left": left, "top": top, "right": right, "bottom": bottom}


def normalise_depth(
    raw_depth: np.ndarray, matte: np.ndarray
) -> tuple[np.ndarray, dict[str, object]]:
    height, width = matte.shape
    left, top, right, bottom = region_bounds(FACE_FOCUS_REGION, width, height)
    focus_matte = matte[top:bottom, left:right] >= 128
    if not focus_matte.any():
        raise RuntimeError("Cannot normalise depth without an opaque face region")
    focus_values = raw_depth[top:bottom, left:right][focus_matte]
    far_raw = float(np.percentile(focus_values, DEPTH_FAR_PERCENTILE))
    near_raw = float(np.percentile(focus_values, DEPTH_NEAR_PERCENTILE))
    if near_raw <= far_raw:
        raise RuntimeError("Depth normalisation range is empty or inverted")

    normalised = np.clip((raw_depth - far_raw) / (near_raw - far_raw), 0.0, 1.0)
    normalised *= matte.astype(np.float32) / 255.0
    depth = np.rint(normalised * 65535.0).astype(np.uint16)
    depth[matte == 0] = 0
    return depth, {
        "focus_region_normalized": region_metadata(FACE_FOCUS_REGION),
        "focus_region_matte_threshold": 128,
        "method": "opaque central-face percentiles, clipped linearly",
        "far_percentile": DEPTH_FAR_PERCENTILE,
        "far_raw": far_raw,
        "near_percentile": DEPTH_NEAR_PERCENTILE,
        "near_raw": near_raw,
    }


def measure_depth(depth: np.ndarray, matte: np.ndarray) -> dict[str, object]:
    """Measure facial range and the centre profile from the encoded 16-bit map."""
    height, width = matte.shape
    left, top, right, bottom = region_bounds(
        HEAD_MEASUREMENT_REGION, width, height
    )
    head_matte = matte[top:bottom, left:right] >= 128
    if not head_matte.any():
        raise RuntimeError("Cannot measure depth without an opaque head region")
    head_values = depth[top:bottom, left:right][head_matte]
    head_min = int(head_values.min())
    head_max = int(head_values.max())

    profile_x = round(PROFILE_X_FRACTION * width)
    profile_y = [
        min(height - 1, round(fraction * height))
        for fraction in PROFILE_Y_FRACTIONS
    ]
    return {
        "face_head_region_normalized": region_metadata(HEAD_MEASUREMENT_REGION),
        "face_head_matte_threshold": 128,
        "face_head_min": head_min,
        "face_head_max": head_max,
        "face_head_standard_deviation": float(head_values.std()),
        "face_head_scale_percentage": (head_max - head_min) / 65535.0 * 100.0,
        "vertical_profile": {
            "x": profile_x,
            "y": profile_y,
            "values": [int(depth[y, profile_x]) for y in profile_y],
        },
    }


def encode_webp_under_budget(
    rgba: Image.Image, destination: Path, byte_budget: int
) -> tuple[int, int]:
    for quality in range(90, 49, -1):
        buffer = io.BytesIO()
        rgba.save(
            buffer,
            format="WEBP",
            quality=quality,
            method=6,
            exact=True,
        )
        payload = buffer.getvalue()
        if len(payload) <= byte_budget:
            destination.write_bytes(payload)
            return quality, len(payload)
    raise RuntimeError(
        f"Could not encode {destination.name} below {byte_budget:,} bytes"
    )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def bake_tier(
    tier: Tier,
    processor: AutoImageProcessor,
    model: AutoModelForDepthEstimation,
) -> list[Path]:
    source_path = SOURCE_DIR / tier.source
    image = resize_source(source_path, tier.long_edge)
    matte, clean_rgb = estimate_matte(image)
    raw_depth = infer_depth(image, processor, model)
    depth, normalisation = normalise_depth(raw_depth, matte)
    measurements = measure_depth(depth, matte)

    colour_path = OUTPUT_DIR / f"colour{tier.suffix}.webp"
    depth_path = OUTPUT_DIR / f"depth{tier.suffix}.png"
    matte_path = OUTPUT_DIR / f"matte{tier.suffix}.png"
    metadata_path = OUTPUT_DIR / f"portrait{tier.suffix}.json"

    rgba = np.dstack((clean_rgb, matte))
    webp_quality, _ = encode_webp_under_budget(
        Image.fromarray(rgba, mode="RGBA"), colour_path, tier.colour_budget
    )
    Image.fromarray(depth, mode="I;16").save(
        depth_path, format="PNG", optimize=True, compress_level=9
    )
    Image.fromarray(matte, mode="L").save(
        matte_path, format="PNG", optimize=True, compress_level=9
    )

    metadata = {
        "bake_date": BAKE_DATE,
        "crop": {
            "composition": "head-and-shoulders square",
            "method": "full frame of the pre-cropped square source",
        },
        "depth": {
            "bit_depth": 16,
            "convention": DEPTH_CONVENTION,
            "measurements": measurements,
            "normalisation": normalisation,
        },
        "dimensions": {"height": image.height, "width": image.width},
        "matte": {
            "bit_depth": 8,
            "convention": "background=0, opaque subject=255",
            "method": "border-connected white-seamless extraction with solved soft edge",
        },
        "model": {
            "id": MODEL_ID,
            "license": MODEL_LICENSE,
            "revision": MODEL_REVISION,
            "transformers_version": __import__("transformers").__version__,
            "weights_download_bytes": MODEL_WEIGHTS_DOWNLOAD_BYTES,
            "weights_cached_outside_repo": True,
        },
        "output": {
            "colour_webp_quality": webp_quality,
            "long_edge": tier.long_edge,
        },
        "seed": SEED,
        "source_filename": tier.source,
    }
    metadata_path.write_text(
        json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return [colour_path, depth_path, matte_path, metadata_path]


def main() -> None:
    configure_determinism()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Loading {MODEL_ID} at pinned revision {MODEL_REVISION} on CPU")
    processor = AutoImageProcessor.from_pretrained(
        MODEL_ID, revision=MODEL_REVISION
    )
    model = AutoModelForDepthEstimation.from_pretrained(
        MODEL_ID, revision=MODEL_REVISION
    )
    model.to("cpu")
    model.eval()

    generated: list[Path] = []
    for tier in TIERS:
        print(f"Baking {tier.source} at {tier.long_edge}px long edge")
        generated.extend(bake_tier(tier, processor, model))

    total = sum(path.stat().st_size for path in generated)
    print("Generated:")
    for path in generated:
        if path.suffix == ".json":
            dimensions = "metadata"
        else:
            with Image.open(path) as image:
                dimensions = f"{image.width}x{image.height}"
        print(
            f"  {path.relative_to(REPO_ROOT)}  {dimensions}  "
            f"{path.stat().st_size:,} bytes  sha256={sha256(path)}"
        )
    print(f"Total generated asset size: {total:,} bytes")


if __name__ == "__main__":
    main()
