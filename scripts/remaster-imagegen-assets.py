#!/usr/bin/env python3
"""Convert Codex image-generation atlases into shipped game assets.

Inputs are copied into generated-assets/source/ before this script runs. The
script removes chroma-key backgrounds, crops atlas cells, normalizes anchors,
and writes the exact PNG paths consumed by src/game/assets.js.

Some scene/UI assets are hand-authored or derived from the user's local PVZ
asset pack after the atlas pass. They are listed in HAND_AUTHORED_ASSETS and
validated at the end so a clean remaster cannot silently ship with missing
runtime paths.
"""

from __future__ import annotations

import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "generated-assets"
SOURCE = OUT / "source"

SPRITE_ATLAS = SOURCE / "imagegen-sprite-atlas.png"
UI_ATLAS = SOURCE / "imagegen-ui-atlas.png"
ZOMBIE_SHEET = SOURCE / "imagegen-zombie-animation-atlas.png"
PLANT_SHEET = SOURCE / "imagegen-plant-animation-atlas.png"

HAND_AUTHORED_ASSETS = [
    "scene/day-lawn.png",
    "scene/house-left.png",
    "ui/mower-padded.png",
    "ui/sun-original-padded.gif",
]

VISUAL_POLISH_OUTPUT_ASSETS = [
    "ui/sun-original-padded.gif",
    "ui/resource-brain.png",
    "scene/house-left.png",
    "sprites/plants/repeater-idle.png",
    "sprites/plants/repeater-attack.png",
    "sprites/zombies/basic-death.png",
    "sprites/zombies/imp-death.png",
    "sprites/zombies/flag-death.png",
    "sprites/zombies/cone-death.png",
    "sprites/zombies/screen-death.png",
    "sprites/zombies/bucket-death.png",
    "sprites/zombies/zamboni-death.png",
    "sprites/zombies/runner-death.png",
]

REPEATER_GENERATION_SPEC = (
    "repeater: pea shooter variant, one pea cannon mouth only, "
    "almond-shaped eyes, different expression from peashooter, no second barrel"
)

SUN_NORMALIZATION_SPEC = (
    "sun-original-padded.gif must keep transparent padding on all sides so "
    "the rendered sun rays are not clipped."
)

REQUIRED_OUTPUT_ASSETS = list(dict.fromkeys([
    *HAND_AUTHORED_ASSETS,
    *VISUAL_POLISH_OUTPUT_ASSETS,
    "ui/card-frame.png",
    "ui/card-disabled.png",
    "ui/resource-sun.png",
    "ui/resource-brain.png",
    "ui/progress-empty.png",
    "projectiles/pea.png",
    "fx/explosion.png",
    "fx/row-fire.png",
    "fx/armor-cone.png",
    "fx/armor-bucket.png",
    "fx/armor-screen.png",
    "fx/armor-runner.png",
    "sprites/plants/sunflower-idle.png",
    "sprites/plants/peashooter-attack.png",
    "sprites/zombies/basic-walk.png",
    "sprites/zombies/basic-eat.png",
    "sprites/zombies/basic-death.png",
    "sprites/zombies/flag-death.png",
    "sprites/zombies/cone-death.png",
    "sprites/zombies/screen-death.png",
    "sprites/zombies/bucket-death.png",
    "sprites/zombies/imp-death.png",
    "sprites/zombies/zamboni-death.png",
    "sprites/zombies/runner-death.png",
]))


def keyed(image: Image.Image, mode: str) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if mode == "magenta":
                remove = r > 185 and b > 165 and g < 115 and abs(r - b) < 95
            else:
                remove = g > 170 and r < 125 and b < 135
            if remove:
                pixels[x, y] = (r, g, b, 0)
    return image


def component_bbox(image: Image.Image, min_area: int = 18) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A")
    width, height = image.size
    data = alpha.load()
    seen: set[tuple[int, int]] = set()
    boxes = []
    for y in range(height):
        for x in range(width):
            if (x, y) in seen or data[x, y] <= 20:
                continue
            stack = [(x, y)]
            seen.add((x, y))
            left = right = x
            top = bottom = y
            area = 0
            while stack:
                px, py = stack.pop()
                area += 1
                left = min(left, px)
                right = max(right, px)
                top = min(top, py)
                bottom = max(bottom, py)
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height or (nx, ny) in seen:
                        continue
                    if data[nx, ny] > 20:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            if area >= min_area:
                boxes.append((area, left, top, right + 1, bottom + 1))
    if not boxes:
        return None
    boxes.sort(reverse=True)
    # Keep the main body and nearby medium pieces, but drop far-away bullets or
    # fragments that make the normalized character shrink.
    main = boxes[0]
    main_cx = (main[1] + main[3]) / 2
    main_cy = (main[2] + main[4]) / 2
    kept = [main]
    for box in boxes[1:]:
        area, left, top, right, bottom = box
        cx = (left + right) / 2
        cy = (top + bottom) / 2
        if area > main[0] * 0.08 and abs(cx - main_cx) < width * 0.33 and abs(cy - main_cy) < height * 0.45:
            kept.append(box)
    return (
        min(box[1] for box in kept),
        min(box[2] for box in kept),
        max(box[3] for box in kept),
        max(box[4] for box in kept),
    )


def trim(image: Image.Image, pad: int = 8, largest: bool = False) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = component_bbox(image) if largest else alpha.getbbox()
    if not bbox:
        return image
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(image.width, bbox[2] + pad)
    bottom = min(image.height, bbox[3] + pad)
    return image.crop((left, top, right, bottom))


def fit_sprite(image: Image.Image, frame_w: int, frame_h: int, max_w: int, max_h: int, bottom_margin: int = 4) -> Image.Image:
    image = trim(image, largest=True)
    scale = min(max_w / image.width, max_h / image.height, 1.0)
    resized = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    x = round((frame_w - resized.width) / 2)
    y = frame_h - resized.height - bottom_margin
    frame.alpha_composite(resized, (x, max(0, y)))
    return frame


def fit_center(image: Image.Image, width: int, height: int, max_w: int | None = None, max_h: int | None = None) -> Image.Image:
    image = trim(image)
    max_w = max_w or width
    max_h = max_h or height
    scale = min(max_w / image.width, max_h / image.height)
    resized = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    frame.alpha_composite(resized, (round((width - resized.width) / 2), round((height - resized.height) / 2)))
    return frame


def fit_stretch(image: Image.Image, width: int, height: int) -> Image.Image:
    return trim(image).resize((width, height), Image.Resampling.LANCZOS)


def crop_keyed(image: Image.Image, box: tuple[int, int, int, int], mode: str) -> Image.Image:
    return keyed(image.crop(box), mode)


def remove_magenta_spill(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                pixels[x, y] = (0, 0, 0, 0)
            elif r > 95 and b > 85 and g < 90 and b > g * 1.4:
                pixels[x, y] = (0, 0, 0, 0)
    return image


def save(path: str, image: Image.Image) -> None:
    target = OUT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target)


def sheet_from_frames(path: str, frames: list[Image.Image], frame_w: int, frame_h: int) -> None:
    out = Image.new("RGBA", (frame_w * len(frames), frame_h), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        out.alpha_composite(frame, (frame_w * index, 0))
    save(path, out)


def grid_frames(source: Image.Image, rows: int, cols: int, row: int, frame_indices: list[int], mode: str, frame_w: int, frame_h: int, max_w: int, max_h: int) -> list[Image.Image]:
    cell_w = source.width / cols
    cell_h = source.height / rows
    expand_x = cell_w * 0.11
    expand_y = cell_h * 0.07
    frames = []
    for col in frame_indices:
        box = (
            max(0, round(col * cell_w - expand_x)),
            max(0, round(row * cell_h - expand_y)),
            min(source.width, round((col + 1) * cell_w + expand_x)),
            min(source.height, round((row + 1) * cell_h + expand_y)),
        )
        frames.append(fit_sprite(crop_keyed(source, box, mode), frame_w, frame_h, max_w, max_h))
    return frames


def transformed_frames(base: Image.Image, count: int, frame_w: int, frame_h: int, max_w: int, max_h: int, mode: str = "walk") -> list[Image.Image]:
    base = fit_sprite(base, frame_w, frame_h, max_w, max_h)
    frames = []
    for index in range(count):
        t = index / max(1, count - 1)
        phase = math.sin(t * math.tau)
        frame = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
        if mode == "eat":
            scale_x = 1.0 + max(0, phase) * 0.04
            scale_y = 1.0 - max(0, phase) * 0.025
            dx = -2 - round(max(0, phase) * 3)
            dy = round(max(0, phase) * 1)
            angle = -1.5
        elif mode == "death":
            scale_x = 1.0 - t * 0.08
            scale_y = 1.0 - t * 0.16
            dx = -round(t * 12)
            dy = round(t * 18)
            angle = -t * 18
        elif mode == "drive":
            scale_x = scale_y = 1.0
            dx = round(math.sin(index * math.tau / count) * 2)
            dy = round(math.cos(index * math.tau / count) * 1)
            angle = 0
        else:
            scale_x = scale_y = 1.0
            dx = round(phase * 2)
            dy = round(abs(phase) * 3)
            angle = phase * 1.5
        working = base
        if mode == "death":
            working = ImageEnhance.Brightness(working).enhance(max(0.35, 1 - t * 0.5))
            alpha = working.getchannel("A").point(lambda value: round(value * max(0.25, 1 - t * 0.7)))
            working.putalpha(alpha)
        resized = working.resize((max(1, round(frame_w * scale_x)), max(1, round(frame_h * scale_y))), Image.Resampling.LANCZOS)
        rotated = resized.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        frame.alpha_composite(rotated, (round((frame_w - rotated.width) / 2 + dx), round((frame_h - rotated.height) / 2 + dy)))
        frames.append(frame)
    return frames


def extract_grid_frame(source: Image.Image, rows: int, cols: int, row: int, col: int, mode: str, frame_w: int, frame_h: int, max_w: int, max_h: int) -> Image.Image:
    return grid_frames(source, rows, cols, row, [col], mode, frame_w, frame_h, max_w, max_h)[0]


def first_opaque_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").getbbox()


def tint_image(image: Image.Image, color: tuple[int, int, int], strength: float) -> Image.Image:
    tinted = Image.new("RGBA", image.size, (*color, 0))
    alpha = image.getchannel("A").point(lambda value: round(value * strength))
    tinted.putalpha(alpha)
    base = image.copy()
    base.alpha_composite(tinted)
    return base


def paste_piece(canvas: Image.Image, piece: Image.Image, center_x: int, bottom_y: int, angle: float = 0, scale: float = 1.0, alpha: float = 1.0) -> None:
    if alpha < 1:
        piece = piece.copy()
        piece.putalpha(piece.getchannel("A").point(lambda value: round(value * alpha)))
    if scale != 1.0:
        piece = piece.resize((max(1, round(piece.width * scale)), max(1, round(piece.height * scale))), Image.Resampling.LANCZOS)
    if angle:
        piece = piece.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    canvas.alpha_composite(piece, (round(center_x - piece.width / 2), round(bottom_y - piece.height)))


def dust_layer(width: int, height: int, points: list[tuple[int, int, int, float]]) -> Image.Image:
    layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for x, y, radius, alpha in points:
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(218, 197, 145, round(210 * alpha)))
        draw.ellipse((x - radius // 2, y - radius // 2, x + radius // 2, y + radius // 2), fill=(245, 228, 165, round(120 * alpha)))
    return layer.filter(ImageFilter.GaussianBlur(0.6))


def split_body(frame: Image.Image) -> tuple[Image.Image, Image.Image, Image.Image]:
    bbox = first_opaque_bbox(frame)
    if not bbox:
        empty = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        return empty, empty, empty
    left, top, right, bottom = bbox
    h = bottom - top
    cuts = (top + round(h * 0.34), top + round(h * 0.68))
    pieces = []
    for piece_top, piece_bottom in ((top, cuts[0]), (cuts[0], cuts[1]), (cuts[1], bottom)):
        mask = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        mask.alpha_composite(frame.crop((left, piece_top, right, piece_bottom)), (left, piece_top))
        pieces.append(mask)
    return pieces[0], pieces[1], pieces[2]


def death_frames_from_codex_art(base_frames: list[Image.Image], frame_w: int, frame_h: int, zombie: str) -> list[Image.Image]:
    """Create zombie defeat strips from Codex-generated sprite art.

    This intentionally avoids the old generic transformed fade sequence. The
    frames use Codex-generated walk/eat/drive poses plus generated dust and
    armor fragments, giving each zombie a visible hit, collapse, and remains
    phase while preserving the same frame contract as the runtime manifest.
    """
    if not base_frames:
        raise ValueError(f"missing base frames for {zombie}")
    base_frames = [fit_sprite(frame, frame_w, frame_h, 108, 122 if zombie != "zamboni" else 94) for frame in base_frames]
    base = base_frames[min(len(base_frames) - 1, 2)]
    hit = tint_image(base, (255, 236, 151), 0.42)
    head, torso, legs = split_body(base)
    bbox = first_opaque_bbox(base) or (20, 20, frame_w - 20, frame_h - 8)
    cx = round((bbox[0] + bbox[2]) / 2)
    bottom = bbox[3]
    frames: list[Image.Image] = []

    frame0 = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    frame0.alpha_composite(base)
    frames.append(frame0)

    frame1 = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    frame1.alpha_composite(dust_layer(frame_w, frame_h, [(cx + 20, bottom - 42, 10, 0.75), (cx + 33, bottom - 55, 6, 0.5)]))
    frame1.alpha_composite(hit)
    frames.append(frame1)

    lean = base.rotate(-12 if zombie != "runner" else -18, resample=Image.Resampling.BICUBIC, expand=True)
    frame2 = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    frame2.alpha_composite(dust_layer(frame_w, frame_h, [(cx + 4, bottom - 8, 13, 0.65), (cx + 28, bottom - 10, 9, 0.55)]))
    frame2.alpha_composite(lean, (round(cx - lean.width / 2 - 5), round(bottom - lean.height + 10)))
    frames.append(frame2)

    frame3 = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    frame3.alpha_composite(dust_layer(frame_w, frame_h, [(cx - 15, bottom - 5, 14, 0.8), (cx + 24, bottom - 7, 12, 0.7), (cx + 44, bottom - 10, 7, 0.45)]))
    paste_piece(frame3, torso, cx - 5, bottom + 10, angle=-32, scale=0.96, alpha=0.92)
    paste_piece(frame3, head, cx + 18, bottom - 14, angle=-18, scale=0.92, alpha=0.9)
    paste_piece(frame3, legs, cx - 20, bottom + 3, angle=12, scale=0.9, alpha=0.86)
    frames.append(frame3)

    frame4 = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    frame4.alpha_composite(dust_layer(frame_w, frame_h, [(cx - 20, bottom - 3, 15, 0.8), (cx + 15, bottom - 4, 16, 0.75), (cx + 45, bottom - 5, 10, 0.5)]))
    paste_piece(frame4, head, cx + 28, bottom - 3, angle=28, scale=0.78, alpha=0.72)
    paste_piece(frame4, torso, cx - 6, bottom + 5, angle=-62, scale=0.72, alpha=0.68)
    paste_piece(frame4, legs, cx - 31, bottom + 2, angle=-8, scale=0.68, alpha=0.62)
    frames.append(frame4)

    frame5 = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    frame5.alpha_composite(dust_layer(frame_w, frame_h, [(cx - 24, bottom - 2, 13, 0.58), (cx + 10, bottom - 3, 17, 0.62), (cx + 38, bottom - 5, 11, 0.45)]))
    paste_piece(frame5, torso, cx + 4, bottom + 2, angle=-82, scale=0.5, alpha=0.48)
    paste_piece(frame5, legs, cx - 24, bottom + 1, angle=18, scale=0.46, alpha=0.45)
    frames.append(frame5)

    frame6 = dust_layer(frame_w, frame_h, [(cx - 28, bottom - 1, 12, 0.34), (cx + 2, bottom - 2, 18, 0.38), (cx + 34, bottom - 2, 11, 0.28)])
    frames.append(frame6)

    frame7 = dust_layer(frame_w, frame_h, [(cx - 20, bottom - 1, 10, 0.18), (cx + 12, bottom - 1, 15, 0.2)])
    frames.append(frame7)
    return frames


def make_ui() -> None:
    ui = Image.open(UI_ATLAS)
    crops = {
        "card-frame.png": ((50, 45, 240, 360), (72, 58)),
        "card-selected.png": ((268, 42, 470, 362), (72, 58)),
        "card-disabled.png": ((498, 43, 690, 362), (72, 58)),
        "resource-sun.png": ((946, 44, 1435, 203), (138, 48)),
        "resource-brain.png": ((944, 233, 1440, 372), (138, 48)),
        "timer-panel.png": ((1110, 382, 1420, 490), (118, 44)),
        "progress-empty.png": ((42, 410, 454, 512), (180, 30)),
        "progress-full.png": ((40, 542, 458, 652), (180, 30)),
        "status-panel.png": ((40, 728, 829, 931), (890, 58)),
        "overlay-panel.png": ((860, 721, 1277, 962), (520, 220)),
        "shovel.png": ((906, 408, 1064, 640), (72, 72)),
        "mower.png": ((1068, 500, 1274, 650), (96, 64)),
        "sun.png": ((1318, 516, 1460, 658), (64, 64)),
        "panel-plants.png": ((40, 728, 829, 931), (548, 132)),
        "panel-zombies.png": ((860, 721, 1277, 962), (432, 132)),
    }
    stretch = {
        "card-frame.png",
        "card-selected.png",
        "card-disabled.png",
        "status-panel.png",
        "overlay-panel.png",
        "panel-plants.png",
        "panel-zombies.png",
        "progress-empty.png",
        "progress-full.png",
    }
    for filename, (box, size) in crops.items():
        crop = crop_keyed(ui, box, "green")
        image = fit_stretch(crop, *size) if filename in stretch else fit_center(crop, *size)
        save(f"ui/{filename}", image)


def make_projectiles_and_fx() -> None:
    atlas = Image.open(SPRITE_ATLAS)
    crops = {
        "projectiles/pea.png": ((35, 728, 166, 794), (42, 42)),
        "projectiles/frost.png": ((194, 719, 342, 802), (42, 42)),
        "projectiles/firepea.png": ((382, 705, 542, 812), (42, 42)),
        "fx/hit.png": ((1100, 720, 1225, 830), (64, 64)),
        "fx/ignite.png": ((382, 705, 542, 812), (64, 64)),
        "fx/armor-bucket.png": ((846, 892, 952, 990), (64, 54)),
        "fx/armor-screen.png": ((1135, 890, 1266, 998), (64, 54)),
    }
    for path, (box, size) in crops.items():
        save(path, fit_center(crop_keyed(atlas, box, "magenta"), *size))
    save("fx/armor-cone.png", make_broken_cone_armor(atlas))
    save("fx/armor-runner.png", make_broken_runner_armor(atlas))
    explosion = fit_center(crop_keyed(atlas, (1245, 694, 1460, 844), "magenta"), 96, 96)
    sheet_from_frames("fx/explosion.png", transformed_frames(explosion, 8, 96, 96, 96, 96, "death"), 96, 96)
    fire = fit_center(crop_keyed(atlas, (88, 880, 622, 986), "magenta"), 128, 64)
    sheet_from_frames("fx/row-fire.png", transformed_frames(fire, 6, 128, 64, 128, 64, "drive"), 128, 64)


def make_broken_cone_armor(atlas: Image.Image) -> Image.Image:
    cone = remove_magenta_spill(crop_keyed(atlas, (585, 388, 690, 486), "magenta"))
    cone = cone.rotate(-65, expand=True, resample=Image.Resampling.BICUBIC, fillcolor=(0, 0, 0, 0))
    image = remove_magenta_spill(fit_center(cone, 64, 54))
    alpha = image.getchannel("A")
    mask = ImageDraw.Draw(alpha)
    mask.polygon([(47, 8), (59, 12), (51, 23)], fill=0)
    image.putalpha(alpha)
    draw = ImageDraw.Draw(image)
    draw.line([(24, 18), (31, 25), (29, 34)], fill=(96, 42, 12, 220), width=2)
    draw.line([(34, 19), (39, 28), (46, 31)], fill=(126, 52, 12, 210), width=2)
    draw.line([(49, 13), (51, 22)], fill=(101, 46, 17, 200), width=2)
    return image


def make_broken_runner_armor(atlas: Image.Image) -> Image.Image:
    source = remove_magenta_spill(atlas.crop((1290, 438, 1438, 548)))
    pixels = source.load()
    mask = Image.new("L", source.size, 0)
    mask_pixels = mask.load()
    for y in range(source.height):
        for x in range(source.width):
            r, g, b, a = pixels[x, y]
            red_shell = r > 110 and g < 95 and b < 95
            white_or_gray_guard = r > 110 and g > 95 and b > 85 and abs(r - g) < 65 and abs(g - b) < 65
            dark_outline = r < 70 and g < 70 and b < 70 and 24 < y < 95 and x > 12
            if a and (red_shell or white_or_gray_guard or dark_outline):
                mask_pixels[x, y] = 255
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.2))
    helmet = Image.new("RGBA", source.size, (0, 0, 0, 0))
    helmet.alpha_composite(source)
    helmet.putalpha(mask)
    helmet = remove_magenta_spill(helmet)
    bbox = helmet.getbbox()
    if bbox:
        helmet = helmet.crop(bbox)
    helmet = remove_magenta_spill(helmet.rotate(-18, expand=True, resample=Image.Resampling.BICUBIC, fillcolor=(0, 0, 0, 0)))
    helmet.thumbnail((58, 42), Image.Resampling.LANCZOS)
    image = Image.new("RGBA", (64, 54), (0, 0, 0, 0))
    image.alpha_composite(helmet, (round((64 - helmet.width) / 2), round((54 - helmet.height) / 2)))
    image = remove_magenta_spill(image)
    draw = ImageDraw.Draw(image)
    draw.line([(27, 18), (34, 24), (31, 31)], fill=(86, 20, 20, 230), width=2)
    draw.line([(42, 15), (48, 23), (54, 25)], fill=(98, 22, 22, 220), width=2)
    return image


def make_plant_sheets() -> None:
    src = Image.open(PLANT_SHEET)
    rows, cols = 10, 7
    fw = fh = 96
    row_map = {
        "sunflower": 0,
        "peashooter": 1,
        "repeater": 2,
        "wallnut": 3,
        "frostshooter": 4,
        "twinSunflower": 5,
        "torchwood": 6,
        "potatoMine": 7,
        "jalapeno": 8,
        "cherrybomb": 9,
    }
    sheet_from_frames("sprites/plants/sunflower-idle.png", grid_frames(src, rows, cols, 0, [0, 1, 2, 3], "magenta", fw, fh, 86, 90), fw, fh)
    sheet_from_frames("sprites/plants/sunflower-produce.png", grid_frames(src, rows, cols, 0, [0, 1, 2, 3, 4, 6], "magenta", fw, fh, 92, 94), fw, fh)
    sheet_from_frames("sprites/plants/peashooter-idle.png", grid_frames(src, rows, cols, 1, [0, 1, 2, 3], "magenta", fw, fh, 88, 88), fw, fh)
    sheet_from_frames("sprites/plants/peashooter-attack.png", grid_frames(src, rows, cols, 1, [0, 1, 2, 3, 4, 5], "magenta", fw, fh, 92, 88), fw, fh)
    sheet_from_frames("sprites/plants/repeater-idle.png", grid_frames(src, rows, cols, 2, [0, 1, 2, 3], "magenta", fw, fh, 92, 88), fw, fh)
    sheet_from_frames("sprites/plants/repeater-attack.png", grid_frames(src, rows, cols, 2, [0, 1, 2, 3, 4, 5], "magenta", fw, fh, 94, 88), fw, fh)
    sheet_from_frames("sprites/plants/wallnut-idle.png", grid_frames(src, rows, cols, 3, [0, 1, 2, 6], "magenta", fw, fh, 78, 92), fw, fh)
    sheet_from_frames("sprites/plants/wallnut-damaged.png", grid_frames(src, rows, cols, 3, [2, 3, 4, 5], "magenta", fw, fh, 82, 92), fw, fh)
    sheet_from_frames("sprites/plants/frostshooter-idle.png", grid_frames(src, rows, cols, 4, [0, 1, 2, 3], "magenta", fw, fh, 90, 88), fw, fh)
    sheet_from_frames("sprites/plants/frostshooter-attack.png", grid_frames(src, rows, cols, 4, [0, 1, 2, 3, 4, 5], "magenta", fw, fh, 92, 88), fw, fh)
    sheet_from_frames("sprites/plants/twinSunflower-idle.png", grid_frames(src, rows, cols, 5, [0, 1, 2, 3], "magenta", fw, fh, 94, 88), fw, fh)
    sheet_from_frames("sprites/plants/twinSunflower-produce.png", grid_frames(src, rows, cols, 5, [0, 1, 2, 3, 4, 5], "magenta", fw, fh, 96, 92), fw, fh)
    sheet_from_frames("sprites/plants/torchwood-idle.png", grid_frames(src, rows, cols, 6, [0, 1, 2, 3], "magenta", fw, fh, 82, 92), fw, fh)
    sheet_from_frames("sprites/plants/torchwood-attack.png", grid_frames(src, rows, cols, 6, [0, 1, 2, 3, 4, 5], "magenta", fw, fh, 84, 92), fw, fh)
    sheet_from_frames("sprites/plants/potatoMine-buried.png", grid_frames(src, rows, cols, 7, [0, 1, 2, 3], "magenta", fw, fh, 82, 72), fw, fh)
    sheet_from_frames("sprites/plants/potatoMine-armed.png", grid_frames(src, rows, cols, 7, [1, 2, 3, 4], "magenta", fw, fh, 84, 76), fw, fh)
    sheet_from_frames("sprites/plants/potatoMine-death.png", grid_frames(src, rows, cols, 7, [0, 1, 2, 3, 4, 5, 6], "magenta", fw, fh, 90, 80), fw, fh)
    sheet_from_frames("sprites/plants/jalapeno-idle.png", grid_frames(src, rows, cols, 8, [0, 1, 2, 3], "magenta", fw, fh, 72, 92), fw, fh)
    sheet_from_frames("sprites/plants/jalapeno-activate.png", grid_frames(src, rows, cols, 8, [0, 1, 2, 3, 4, 6], "magenta", fw, fh, 88, 94), fw, fh)
    sheet_from_frames("sprites/plants/cherrybomb-idle.png", grid_frames(src, rows, cols, 9, [0, 1, 2, 3], "magenta", fw, fh, 90, 80), fw, fh)
    sheet_from_frames("sprites/plants/cherrybomb-activate.png", grid_frames(src, rows, cols, 9, [0, 1, 2, 3, 4, 5], "magenta", fw, fh, 92, 84), fw, fh)
    for plant in ["sunflower", "peashooter", "repeater", "frostshooter", "twinSunflower", "torchwood", "potatoMine", "jalapeno", "cherrybomb"]:
        row = row_map[plant]
        sheet_from_frames(f"sprites/plants/{plant}-damaged.png", grid_frames(src, rows, cols, row, [2, 3, 4, 5], "magenta", fw, fh, 90, 90), fw, fh)


def make_zombie_sheets() -> None:
    anim = Image.open(ZOMBIE_SHEET)
    static = Image.open(SPRITE_ATLAS)
    fw, fh = 112, 128
    animated = {
        "basic-walk": (0, [0, 1, 2, 3, 4, 5]),
        "basic-eat": (1, [0, 1, 2, 3, 4, 5]),
        "cone-walk": (2, [0, 1, 2, 3, 4, 5]),
        "cone-eat": (3, [0, 1, 2, 3, 4, 5]),
        "bucket-walk": (4, [0, 1, 2, 3, 4, 5]),
        "bucket-eat": (5, [0, 1, 2, 3, 4, 5]),
        "imp-walk": (6, [0, 1, 2, 3, 4, 5]),
        "runner-walk": (7, [0, 1, 2, 3, 4, 5]),
    }
    for name, (row, columns) in animated.items():
        max_w = 88 if name.startswith("imp") else 104
        max_h = 112 if name.startswith("imp") else 122
        sheet_from_frames(f"sprites/zombies/{name}.png", grid_frames(anim, 8, 6, row, columns, "magenta", fw, fh, max_w, max_h), fw, fh)

    static_boxes = {
        "flag": (365, 420, 545, 664),
        "screen": (760, 430, 946, 660),
        "zamboni": (1086, 515, 1266, 666),
        "runner": (1272, 438, 1462, 675),
        "imp": (220, 510, 358, 660),
        "basic": (20, 420, 198, 660),
        "cone": (575, 420, 718, 660),
        "bucket": (966, 420, 1134, 662),
    }
    for zombie in ["flag", "screen"]:
        base = crop_keyed(static, static_boxes[zombie], "magenta")
        sheet_from_frames(f"sprites/zombies/{zombie}-walk.png", transformed_frames(base, 6, fw, fh, 105, 122, "walk"), fw, fh)
        sheet_from_frames(f"sprites/zombies/{zombie}-eat.png", transformed_frames(base, 6, fw, fh, 108, 122, "eat"), fw, fh)
    zamboni = crop_keyed(static, static_boxes["zamboni"], "magenta")
    sheet_from_frames("sprites/zombies/zamboni-drive.png", transformed_frames(zamboni, 6, fw, fh, 112, 92, "drive"), fw, fh)
    death_sources = {
        "basic": [extract_grid_frame(anim, 8, 6, 1, col, "magenta", fw, fh, 106, 122) for col in [1, 2, 3, 4]],
        "cone": [extract_grid_frame(anim, 8, 6, 3, col, "magenta", fw, fh, 106, 122) for col in [1, 2, 3, 4]],
        "bucket": [extract_grid_frame(anim, 8, 6, 5, col, "magenta", fw, fh, 106, 122) for col in [1, 2, 3, 4]],
        "imp": [extract_grid_frame(anim, 8, 6, 6, col, "magenta", fw, fh, 88, 112) for col in [1, 2, 3, 4]],
        "runner": [extract_grid_frame(anim, 8, 6, 7, col, "magenta", fw, fh, 108, 122) for col in [1, 2, 3, 4]],
    }
    for zombie in ["flag", "screen", "zamboni"]:
        base = crop_keyed(static, static_boxes[zombie], "magenta")
        max_h = 94 if zombie == "zamboni" else 122
        death_sources[zombie] = [fit_sprite(base, fw, fh, 108, max_h)]

    for zombie in ["basic", "imp", "flag", "cone", "screen", "bucket", "zamboni", "runner"]:
        if not (OUT / f"sprites/zombies/{zombie}-eat.png").exists() and zombie != "zamboni":
            base = crop_keyed(static, static_boxes[zombie], "magenta")
            sheet_from_frames(f"sprites/zombies/{zombie}-eat.png", transformed_frames(base, 6, fw, fh, 105, 122, "eat"), fw, fh)
        sheet_from_frames(f"sprites/zombies/{zombie}-death.png", death_frames_from_codex_art(death_sources[zombie], fw, fh, zombie), fw, fh)


def validate_required_outputs() -> None:
    missing = [asset for asset in REQUIRED_OUTPUT_ASSETS if not (OUT / asset).exists()]
    if missing:
        formatted = "\n".join(f"  - generated-assets/{asset}" for asset in missing)
        raise SystemExit(
            "missing generated runtime assets after remaster:\n"
            f"{formatted}\n"
            "Create or copy the hand-authored assets listed in HAND_AUTHORED_ASSETS "
            "before running verification."
        )


def normalize_day_lawn() -> None:
    """Remove the baked right-side deploy panel so Canvas owns that frame."""
    path = OUT / "scene/day-lawn.png"
    if not path.exists():
        return
    image = Image.open(path).convert("RGBA")
    left, top = 1040, 150
    right, bottom = 1220, 608
    sample_x = min(image.width - 1, 1240)
    pixels = image.load()
    for y in range(top, min(bottom, image.height)):
        fill = pixels[sample_x, y]
        for x in range(left, min(right, image.width)):
            pixels[x, y] = fill
    image.save(path)


def main() -> None:
    for required in [SPRITE_ATLAS, UI_ATLAS, ZOMBIE_SHEET, PLANT_SHEET]:
        if not required.exists():
            raise SystemExit(f"missing source atlas: {required}")
    make_ui()
    make_projectiles_and_fx()
    make_plant_sheets()
    make_zombie_sheets()
    normalize_day_lawn()
    validate_required_outputs()
    print("remastered generated-assets from Codex imagegen atlases")


if __name__ == "__main__":
    main()
