#!/usr/bin/env python3
"""Break the reference chart's glyphs into editable parts (rings, dots, lines).

Writes writer/glyphs.json. Rings and dots snap to shared named sizes so a size
can be adjusted once for every glyph that uses it. The result is a starting
point for hand editing, not a perfect trace; --overlay saves a picture of how
closely the parts match the chart (grey = chart, red = parts only, black = both).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np

WRITER = Path(__file__).resolve().parents[1]
CHART = WRITER.parent / "Atlas9-Font.png"
OUTPUT = WRITER / "glyphs.json"

X_START, X_END, COLUMNS = 65, 1440, 10
ROWS = (
    ("ABCDEFGHIJ", 222, 421, range(10)),
    ("KLMNOPQRST", 504, 706, range(10)),
    ("UVWXYZ", 795, 1027, range(6)),
    ("346", 1110, 1425, (2, 3, 5)),
)
DOT_SIZES = {"small": 10, "medium": 13, "large": 17}
RING_SIZES = {"tiny": 12, "small": 26, "medium": 36, "large": 44, "extra-large": 51}
LINE_WIDTH_RANGE = (2.0, 6.0)
RING_WIDTH_RANGE = (1.5, 5.0)


def ellipse(size: int) -> np.ndarray:
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size, size))


def load_cells(chart_path: Path):
    chart = cv2.imread(str(chart_path), cv2.IMREAD_GRAYSCALE)
    if chart is None:
        raise ValueError(f"Could not read reference chart: {chart_path}")
    cell_width = (X_END - X_START) / COLUMNS
    for characters, top, bottom, columns in ROWS:
        for character, column in zip(characters, columns):
            left = round(X_START + column * cell_width) + 8
            right = round(X_START + (column + 1) * cell_width) - 8
            ink = (chart[top + 4 : min(bottom - 4, chart.shape[0]), left:right] < 110).astype(np.uint8)
            ys, xs = np.nonzero(ink)
            if len(xs) >= 20:
                yield character, ink[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def find_dots(ink: np.ndarray) -> list[list[float]]:
    opened = cv2.morphologyEx(ink, cv2.MORPH_OPEN, ellipse(13))
    count, labels, _, centers = cv2.connectedComponentsWithStats(opened)
    distance = cv2.distanceTransform(ink, cv2.DIST_L2, 5)
    dots = []
    for index in range(1, count):
        ys, xs = np.nonzero(labels == index)
        radius = float(distance[ys, xs].max())
        dots.append([float(centers[index][0]), float(centers[index][1]), radius])
    return dots


def circle_coverage(padded, pad, height, width, radius, step, cos, sin):
    cx = np.arange(-radius // 2, width + radius // 2, step)
    cy = np.arange(-radius // 2, height + radius // 2, step)
    grid_x, grid_y = np.meshgrid(cx, cy)
    px = np.clip(np.rint(grid_x[..., None] + radius * cos).astype(int) + pad, 0, padded.shape[1] - 1)
    py = np.clip(np.rint(grid_y[..., None] + radius * sin).astype(int) + pad, 0, padded.shape[0] - 1)
    return padded[py, px].mean(-1), grid_x, grid_y


def find_rings(ink: np.ndarray, dots, max_rings: int = 3, threshold: float = 0.8):
    height, width = ink.shape
    work = ink.copy()
    for x, y, radius in dots:
        cv2.circle(work, (round(x), round(y)), int(radius + 3), 0, -1)
    pad = 80
    angles = np.linspace(0, 2 * np.pi, 72, endpoint=False)
    cos, sin = np.cos(angles), np.sin(angles)
    rings = []
    for _ in range(max_rings):
        padded = np.pad(cv2.dilate(work, ellipse(3)), pad)
        best = None
        for radius in range(8, 75):
            coverage, grid_x, grid_y = circle_coverage(padded, pad, height, width, radius, 2, cos, sin)
            index = np.unravel_index(np.argmax(coverage), coverage.shape)
            score = coverage[index]
            if score >= threshold and (
                best is None or score > best[0] + 0.015 or (score >= best[0] - 0.015 and radius > best[3])
            ):
                best = (score, int(grid_x[index]), int(grid_y[index]), radius)
        if best is None:
            break
        _, cx, cy, radius = best
        refined = (0.0, cx, cy, radius)
        for candidate in range(radius - 2, radius + 3):
            coverage, grid_x, grid_y = circle_coverage(padded, pad, height, width, candidate, 1, cos, sin)
            near = (np.abs(grid_x - cx) <= 2) & (np.abs(grid_y - cy) <= 2)
            coverage = np.where(near, coverage, 0)
            index = np.unravel_index(np.argmax(coverage), coverage.shape)
            if coverage[index] > refined[0]:
                refined = (coverage[index], int(grid_x[index]), int(grid_y[index]), candidate)
        _, cx, cy, radius = refined
        distance = cv2.distanceTransform(work, cv2.DIST_L2, 5)
        samples = []
        for angle in np.linspace(0, 2 * np.pi, 144, endpoint=False):
            x, y = round(cx + radius * np.cos(angle)), round(cy + radius * np.sin(angle))
            if 0 <= x < width and 0 <= y < height and work[y, x]:
                samples.append(distance[y, x])
        stroke = 2 * float(np.median(samples)) if samples else 2.0
        rings.append([cx, cy, radius, stroke])
        cv2.circle(work, (cx, cy), radius, 0, int(stroke + 4))
    return rings


def bars(mask: np.ndarray, orientation: str, minimum: int):
    shape = (minimum, 1) if orientation == "h" else (1, minimum)
    opened = cv2.morphologyEx(mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, shape))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(opened, connectivity=8)
    found = []
    for index in range(1, count):
        x, y, w, h, area = stats[index]
        if area / max(w, h) > 5.5 and max(w, h) < 14:
            continue
        ys, xs = np.nonzero(labels == index)
        if orientation == "h":
            row = float(np.median(ys)) + 0.5
            found.append(["h", float(x), row, float(x + w), row, area / w])
        else:
            column = float(np.median(xs)) + 0.5
            found.append(["v", column, float(y), column, float(y + h), area / h])
    return opened, found


def find_lines(ink: np.ndarray, dots, rings):
    residue = ink.copy()
    for x, y, radius in dots:
        cv2.circle(residue, (round(x), round(y)), int(radius + 4), 0, -1)
    for cx, cy, radius, stroke in rings:
        cv2.circle(residue, (cx, cy), radius, 0, int(stroke + 3))
    horizontal_mask, horizontal = bars(residue, "h", 6)
    vertical_mask, vertical = bars(residue, "v", 6)
    residue = residue & (1 - cv2.dilate(horizontal_mask, ellipse(3))) & (1 - cv2.dilate(vertical_mask, ellipse(3)))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(residue, connectivity=8)
    diagonal = []
    for index in range(1, count):
        if stats[index, 4] < 25:
            continue
        points = np.column_stack(np.nonzero(labels == index))[:, ::-1].astype(np.float32)
        (cx, cy), (w, h), angle = cv2.minAreaRect(points)
        length, thickness = max(w, h), min(w, h)
        if length < 10:
            continue
        theta = np.deg2rad(angle if w >= h else angle + 90)
        dx, dy = np.cos(theta) * length / 2, np.sin(theta) * length / 2
        diagonal.append(["d", cx - dx, cy - dy, cx + dx, cy + dy, stroke_from(points, length)])
    return merge_lines(horizontal + vertical + diagonal, ink)


def stroke_from(points, length):
    return len(points) / length


def merge_lines(lines, ink):
    """Join collinear pieces that were split by a ring or dot sitting on the line."""
    lines = [list(line) for line in lines]
    merged = True
    while merged:
        merged = False
        for i in range(len(lines)):
            for j in range(i + 1, len(lines)):
                a, b = lines[i], lines[j]
                if a[0] != b[0] or a[0] == "d":
                    continue
                along, across = (1, 2) if a[0] == "h" else (2, 1)
                end = 3 if a[0] == "h" else 4
                if abs(a[across] - b[across]) > 2.5:
                    continue
                first, second = sorted((a, b), key=lambda line: line[along])
                gap_start, gap_end = int(first[end]), int(second[along])
                position = int(round((a[across] + b[across]) / 2))
                if a[0] == "h":
                    gap = ink[max(0, position - 1) : position + 2, gap_start:gap_end]
                    covered = gap.any(0).mean() if gap.size else 1.0
                else:
                    gap = ink[gap_start:gap_end, max(0, position - 1) : position + 2]
                    covered = gap.any(1).mean() if gap.size else 1.0
                if gap_end - gap_start <= 6 or covered >= 0.85:
                    lo, hi = min(a[along], b[along]), max(a[end], b[end])
                    centre = (a[across] + b[across]) / 2
                    width = max(a[5], b[5])
                    lines[i] = (
                        ["h", lo, centre, hi, centre, width]
                        if a[0] == "h"
                        else ["v", centre, lo, centre, hi, width]
                    )
                    lines.pop(j)
                    merged = True
                    break
            if merged:
                break
    return lines


def nearest(value: float, sizes: dict[str, int]) -> str:
    return min(sizes, key=lambda name: abs(sizes[name] - value))


def clamp(value: float, limits) -> float:
    return round(min(max(value, limits[0]), limits[1]) * 2) / 2


def build_glyph(ink: np.ndarray) -> dict:
    height, width = ink.shape
    dots = find_dots(ink)
    rings = find_rings(ink, dots)
    lines = find_lines(ink, dots, rings)
    parts = [
        {"type": "ring", "cx": cx, "cy": cy, "size": nearest(radius, RING_SIZES), "width": clamp(stroke, RING_WIDTH_RANGE)}
        for cx, cy, radius, stroke in rings
    ]
    parts += [
        {"type": "dot", "cx": round(x, 1), "cy": round(y, 1), "size": nearest(radius, DOT_SIZES)}
        for x, y, radius in dots
    ]
    parts += [
        {
            "type": "line",
            "x1": round(line[1], 1),
            "y1": round(line[2], 1),
            "x2": round(line[3], 1),
            "y2": round(line[4], 1),
            "width": clamp(line[5], LINE_WIDTH_RANGE),
        }
        for line in lines
        if np.hypot(line[3] - line[1], line[4] - line[2]) >= 6
    ]
    return {"width": width, "height": height, "parts": parts}


def draw(glyph: dict) -> np.ndarray:
    canvas = np.zeros((glyph["height"], glyph["width"]), np.uint8)
    for part in glyph["parts"]:
        if part["type"] == "dot":
            cv2.circle(canvas, (round(part["cx"]), round(part["cy"])), DOT_SIZES[part["size"]], 1, -1)
        elif part["type"] == "ring":
            cv2.circle(canvas, (round(part["cx"]), round(part["cy"])), RING_SIZES[part["size"]], 1, max(1, round(part["width"])))
        else:
            start = (round(part["x1"]), round(part["y1"]))
            end = (round(part["x2"]), round(part["y2"]))
            cv2.line(canvas, start, end, 1, max(1, round(part["width"])))
    return canvas


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chart", type=Path, default=CHART)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--overlay", type=Path, help="also save a comparison image")
    args = parser.parse_args()

    glyphs, tiles = {}, []
    try:
        for character, ink in load_cells(args.chart):
            glyph = build_glyph(ink)
            glyphs[character] = glyph
            drawn = draw(glyph)
            overlap = (drawn & ink).sum() / max(1, (drawn | ink).sum())
            print(f"{character}: {len(glyph['parts'])} parts, overlap with chart {overlap:.0%}")
            tile = np.full((130, 170, 3), 255, np.uint8)
            h, w = min(ink.shape[0], 130), min(ink.shape[1], 170)
            tile[:h, :w][ink[:h, :w] > 0] = (160, 160, 160)
            tile[:h, :w][drawn[:h, :w] > 0] = (0, 0, 200)
            tile[:h, :w][(drawn[:h, :w] > 0) & (ink[:h, :w] > 0)] = (0, 0, 0)
            cv2.putText(tile, character, (2, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 150, 0), 1)
            tiles.append(tile)
    except (ValueError, cv2.error) as error:
        parser.error(str(error))
    if not glyphs:
        parser.error("no glyphs found in the chart")

    document = {"sizes": {"dot": DOT_SIZES, "ring": RING_SIZES}, "glyphs": glyphs}
    args.output.write_text(json.dumps(document, indent=1) + "\n", encoding="utf-8")
    print(f"Wrote {len(glyphs)} glyphs to {args.output}")
    if args.overlay:
        while len(tiles) % 7:
            tiles.append(np.full((130, 170, 3), 255, np.uint8))
        overlay = np.vstack([np.hstack(tiles[i : i + 7]) for i in range(0, len(tiles), 7)])
        if not cv2.imwrite(str(args.overlay), overlay):
            parser.error(f"could not write overlay image: {args.overlay}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
