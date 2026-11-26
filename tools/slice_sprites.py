"""Slice the 5x3 infographic sheets into individual transparent PNG sprites.
The sheets are RGB (fake checkerboard baked in), so the background is removed by
flood-filling from each cell border over 'background-like' pixels.
usage: python3 -I slice_sprites.py <sheet.png> <out_dir> <name1,name2,...15> [size]
"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi

sheet, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
SIZE = int(sys.argv[4]) if len(sys.argv) > 4 else 128
COLS, ROWS = 5, 3
im = Image.open(sheet).convert("RGB")
W, H = im.size
cw, ch = W // COLS, H // ROWS
assert len(names) == COLS * ROWS

def bg_like(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    # checkerboard = near-white / light grey with a slight blue cast; cream clothing has r >> b
    return (a.min(axis=-1) >= 190) & (b >= r - 3) & (abs(g - r) <= 12)

for i, name in enumerate(names):
    row, col = divmod(i, COLS)
    M = 28                                               # overlap margin so art that crosses a cell edge is not cut
    x0, y0 = max(0, col * cw - M), max(0, row * ch - M)
    x1, y1 = min(W, (col + 1) * cw + M), min(H, (row + 1) * ch + M)
    cell = np.array(im.crop((x0, y0, x1, y1)))
    core = np.zeros(cell.shape[:2], bool)                # the cell's own area inside the margin crop
    core[col * cw - x0:(col + 1) * cw - x0, :] = False
    core[row * ch - y0:(row + 1) * ch - y0, col * cw - x0:(col + 1) * cw - x0] = True
    mask = bg_like(cell)
    lab, n = ndi.label(mask)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    fg = ~bg
    fg = ndi.binary_opening(fg, iterations=1)            # drop speckles
    lab2, n2 = ndi.label(ndi.binary_dilation(fg, iterations=6))
    if n2 > 1:                                            # keep components near the biggest one (e.g. smoke puff, parachute strings)
        idx = range(1, n2 + 1)
        sizes = np.array(ndi.sum(fg, lab2, idx)); incore = np.array(ndi.sum(fg & core, lab2, idx))
        # keep parts that belong to THIS cell (mostly inside its core); drop neighbours' art that spills over
        keep = np.isin(lab2, [k + 1 for k in range(n2) if sizes[k] > 0.02 * sizes.max() and incore[k] >= 0.5 * sizes[k]])
        fg &= keep
    fg = ndi.binary_fill_holes(fg) | fg
    alpha = ndi.gaussian_filter(fg.astype(float), 0.8)    # soft edge
    alpha = (np.clip((alpha - 0.2) / 0.6, 0, 1) * 255).astype(np.uint8)
    rgba = np.dstack([cell, alpha])
    img = Image.fromarray(rgba, "RGBA")
    bbox = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    img = img.crop(bbox)
    s = (SIZE - 8) / max(img.size)
    img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(img, ((SIZE - img.width) // 2, (SIZE - img.height) // 2), img)
    canvas.save(f"{out}/{name}.png", optimize=True)
print("ok", len(names))
