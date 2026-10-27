/*
 * OHVault app icon generator.
 *
 * Emits the HarmonyOS layered app icon (background.png + foreground.png +
 * app_layered_image.json) and the flattened single-layer PNGs used by
 * startWindowIcon. Geometry is pure signed distance fields, the PNG encoder is
 * local, so this runs on-device with no image libraries.
 *
 *   ELECTRON_RUN_AS_NODE=1 electron tools/make-layered-icon.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const T = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(b) {
  let c = -1;
  for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, body) {
  const out = Buffer.alloc(8 + body.length + 4);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 'ascii');
  body.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), body])), 8 + body.length);
  return out;
}
function writePng(file, data, n) {
  const s = n * 4;
  const raw = Buffer.alloc((s + 1) * n);
  for (let y = 0; y < n; y++) {
    raw[y * (s + 1)] = 0;
    data.copy(raw, y * (s + 1) + 1, y * s, y * s + s);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0);
  ihdr.writeUInt32BE(n, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}
// The encoder above only writes square RGBA images, which is what every icon
// slot needs; decode just enough of IHDR to prove that is what came back out.
function readSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), depth: b[24], color: b[25] };
}

const V = 1024;
const CX = 512;
const BG = [0xf5, 0x84, 0x2c];
const INK = [0xff, 0xff, 0xff];

function hexAt(cx, cy, r) {
  return [90, 30, -30, -90, -150, 150].map((d) => {
    const a = (d * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  });
}
function seg(x, y, ax, ay, bx, by) {
  const px = x - ax, py = y - ay;
  const ex = bx - ax, ey = by - ay;
  const l2 = ex * ex + ey * ey;
  let t = l2 ? (px * ex + py * ey) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const dx = px - ex * t, dy = py - ey * t;
  return Math.sqrt(dx * dx + dy * dy);
}
function circle(x, y, cx, cy) {
  return Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
}
function lerpPt(p, q, t) {
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
}
function hexPath(cfg) {
  const verts = cfg.verts;
  const out = [];
  for (let i = 0; i < 6; i++) {
    const a = verts[i], b = verts[(i + 1) % 6];
    let t0 = 0, t1 = 1;
    if (!cfg.closed && (i === 0 || i === 5)) {
      if (i === 0) t0 = cfg.gap; else t1 = 1 - cfg.gap;
    }
    out.push([lerpPt(a, b, t0), lerpPt(a, b, t1)]);
  }
  return out;
}
function shape(x, y, cfg) {
  let d = 1e9;
  for (const [a, b] of hexPath(cfg)) d = Math.min(d, seg(x, y, a[0], a[1], b[0], b[1]) - cfg.sw / 2);
  for (const p of cfg.dots) d = Math.min(d, circle(x, y, p[0], p[1]) - p[2]);
  for (const rg of cfg.rings) {
    const r = circle(x, y, rg[0], rg[1]);
    d = Math.min(d, Math.abs(r - rg[2]) - rg[3] / 2);
  }
  for (const h of cfg.holes || []) d = Math.max(d, -(circle(x, y, h[0], h[1]) - h[2]));
  return d;
}

// Design space: the v3 mark as drawn at cy=590 so the apex rings sat above the
// hexagon without crowding the top edge. The layers re-centre it on 512,512.
function markAt(cy, r) {
  const hv = hexAt(CX, cy, r);
  const top = hv[0];
  return {
    sw: 30,
    gap: 0.32,
    closed: false,
    verts: hv,
    dots: [[CX, cy - 85, 54], [CX - 110, cy + 78, 54], [CX + 110, cy + 78, 54]],
    rings: [[top[0], top[1] + 6, 96, 30], [top[0] + 85, top[1] - 79, 96, 30]],
  };
}

function bboxOf(cfg, step) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const hits = [];
  for (let y = 0; y < V; y += step) {
    for (let x = 0; x < V; x += step) {
      if (shape(x, y, cfg) > 0) continue;
      hits.push([x, y]);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const cx = x0 + (x1 - x0) / 2, cy = y0 + (y1 - y0) / 2;
  let r = 0;
  for (const [x, y] of hits) r = Math.max(r, Math.hypot(x - cx, y - cy));
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx, cy, r };
}

// Uniform scale about the mark's own bounding-box centre, which lands that
// centre on the canvas centre. Stroke widths and radii travel with it.
function fit(cfg, k, cxm, cym) {
  const q = ([x, y]) => [V / 2 + (x - cxm) * k, V / 2 + (y - cym) * k];
  return {
    sw: cfg.sw * k,
    gap: cfg.gap,
    closed: cfg.closed,
    verts: cfg.verts.map(q),
    dots: cfg.dots.map(([x, y, r]) => [...q([x, y]), r * k]),
    rings: cfg.rings.map(([x, y, r, t]) => [...q([x, y]), r * k, t * k]),
    holes: (cfg.holes || []).map(([x, y, r]) => [...q([x, y]), r * k]),
  };
}

function renderFlat(cfg, n) {
  const data = Buffer.alloc(n * n * 4);
  const s = V / n;
  const aa = s * 1.15;
  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      const cov = Math.max(0, Math.min(1, 0.5 - shape((px + 0.5) * s, (py + 0.5) * s, cfg) / aa));
      const i = (py * n + px) * 4;
      data[i] = Math.round(BG[0] + (INK[0] - BG[0]) * cov);
      data[i + 1] = Math.round(BG[1] + (INK[1] - BG[1]) * cov);
      data[i + 2] = Math.round(BG[2] + (INK[2] - BG[2]) * cov);
      data[i + 3] = 255;
    }
  }
  return data;
}
function renderInk(cfg, n) {
  const data = Buffer.alloc(n * n * 4);
  const s = V / n;
  const aa = s * 1.15;
  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      const cov = Math.max(0, Math.min(1, 0.5 - shape((px + 0.5) * s, (py + 0.5) * s, cfg) / aa));
      const i = (py * n + px) * 4;
      data[i] = INK[0];
      data[i + 1] = INK[1];
      data[i + 2] = INK[2];
      data[i + 3] = Math.round(cov * 255);
    }
  }
  return data;
}
function renderSolid(n, rgb) {
  const data = Buffer.alloc(n * n * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
  return data;
}

// Ink statistics straight off a written buffer: how much is painted, and where
// the painted rectangle sits. This is the check Huawei's rules are written in
// (background may not contain transparent pixels; the foreground subject must
// not crowd the corners).
function inkStats(data, n) {
  let opaque = 0, painted = 0;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      const a = data[py * n * 4 + px * 4 + 3];
      if (a === 255) opaque++;
      if (a > 8) {
        painted++;
        if (px < x0) x0 = px;
        if (px > x1) x1 = px;
        if (py < y0) y0 = py;
        if (py > y1) y1 = py;
      }
    }
  }
  return { opaque, painted, bbox: { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
}

const ROOT = path.resolve(__dirname, '..');
const MEDIA = path.join(ROOT, 'AppScope', 'resources', 'base', 'media');
const RESFILE = path.join(ROOT, 'web_engine', 'src', 'main', 'resources', 'resfile', 'resources', 'app');

// Huawei's icon grid expresses the safe area as 216 inside a 324 canvas (2/3);
// at the mandated 1024 that is 683. Constrain the mark by its radius, not its
// bounding box: the apex ring sits off-axis, so a box that fits can still poke
// out of the circle. The 4 px allowance is the antialiasing fringe.
const SAFE = Math.round((V * 216) / 324) - 4;

const base = markAt(590, 300);
const bb = bboxOf(base, 2);
const k = SAFE / 2 / bb.r;
const cfg = fit(base, k, bb.cx, bb.cy);
console.log(
  'design bbox ' + Math.round(bb.w) + 'x' + Math.round(bb.h) + ' r=' + Math.round(bb.r) +
  ' -> scale ' + k.toFixed(4) + ' -> painted ' + Math.round(bb.w * k) + 'x' + Math.round(bb.h * k) +
  ' of ' + V + ' (safe ' + SAFE + ')'
);

const ink = renderInk(cfg, V);
const flat = renderFlat(cfg, V);
const jobs = [
  { f: path.join(MEDIA, 'background.png'), buf: renderSolid(V, BG) },
  { f: path.join(MEDIA, 'foreground.png'), buf: ink },
  // Single-layer slots (startWindowIcon, $r('app.media.app_icon')) keep a flat
  // composite so every surface shows the same mark at the same scale.
  ...['app_icon.png', 'icon.png', 'startIcon.png', 'product_logo_32.png', 'tray.png'].map((n) => ({
    f: path.join(MEDIA, n),
    buf: flat,
  })),
  { f: path.join(RESFILE, 'icon.png'), buf: flat },
];
for (const j of jobs) {
  writePng(j.f, j.buf, V);
  const st = fs.statSync(j.f);
  const hdr = readSize(j.f);
  const s = inkStats(j.buf, V);
  console.log(
    path.relative(ROOT, j.f) + ' ' + hdr.w + 'x' + hdr.h + ' c' + hdr.color +
    ' ' + st.size + ' B opaque=' + s.opaque + '/' + (V * V) +
    ' painted=' + s.painted + ' bbox=' + s.bbox.w + 'x' + s.bbox.h +
    ' @' + s.bbox.x0 + ',' + s.bbox.y0
  );
}

const json = path.join(MEDIA, 'app_layered_image.json');
fs.writeFileSync(json, '{\n  "layered-image": {\n    "background": "$media:background",\n    "foreground": "$media:foreground"\n  }\n}\n');
console.log(path.relative(ROOT, json));

// Farthest painted pixel from the canvas centre: the mask diameter the mark
// still fits inside. Printed on every run because it is the number that decides
// whether a composition change is allowed.
(function radius() {
  let r2 = 0;
  for (let py = 0; py < V; py++) {
    for (let px = 0; px < V; px++) {
      if (ink[py * V * 4 + px * 4 + 3] <= 8) continue;
      const d = (px + 0.5 - V / 2) ** 2 + (py + 0.5 - V / 2) ** 2;
      if (d > r2) r2 = d;
    }
  }
  console.log('foreground needs a mask circle of at least ' + Math.ceil(2 * Math.sqrt(r2)) + ' px (canvas ' + V + ')');
})();

// PREVIEW=/some/dir writes eyeball aids outside the repo: the alpha layer over a
// neutral grey, and the composite re-rendered at the sizes the launcher and the
// recent-tasks strip actually use. Re-rendered, never downscaled, so the analytic
// antialiasing is what the device will see.
if (process.env.PREVIEW) {
  const dir = process.env.PREVIEW;
  const grey = Buffer.alloc(V * V * 4);
  for (let i = 0; i < grey.length; i += 4) {
    const a = ink[i + 3] / 255;
    grey[i] = grey[i + 1] = grey[i + 2] = Math.round(64 + (255 - 64) * a);
    grey[i + 3] = 255;
  }
  writePng(path.join(dir, 'fg-on-grey.png'), grey, V);
  for (const n of [24, 48, 96]) writePng(path.join(dir, 'flat-' + n + '.png'), renderFlat(cfg, n), n);
  console.log('previews -> ' + dir);
}
