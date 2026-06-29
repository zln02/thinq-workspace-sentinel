// Tiny helper library for building Lottie (Bodymovin) documents in JS.
// Focused on the motion-graphics primitives this promo needs: image-asset
// layers (for pre-rendered Korean text PNGs), vector shapes (rects, ellipses,
// rounded tiles, lines), and eased keyframes. All times are in FRAMES.

// ---- easing presets (cubic bezier handles, Lottie i/o form) ----
// Lottie accepts single-element handle arrays applied to every dimension.
export const EASE = {
  out:    { o: { x: [0.22], y: [0] }, i: { x: [0.16], y: [1] } },  // decelerate (apple-ish)
  inOut:  { o: { x: [0.45], y: [0] }, i: { x: [0.25], y: [1] } },
  in:     { o: { x: [0.5],  y: [0] }, i: { x: [0.7],  y: [1] } },
  soft:   { o: { x: [0.33], y: [0] }, i: { x: [0.2],  y: [1] } },
  linear: { o: { x: [0.5],  y: [0.5] }, i: { x: [0.5], y: [0.5] } },
};

// Build an animated property from [time, value, easePreset] tuples.
// value may be a number, [n], or [x,y,(z)]. The ease applies to the segment
// LEAVING that keyframe.
export function animated(stops) {
  const k = stops.map(([t, v, ease], idx) => {
    const s = Array.isArray(v) ? v : [v];
    const node = { t, s };
    const e = ease ? EASE[ease] ?? ease : EASE.out;
    if (idx < stops.length - 1) { node.i = e.i; node.o = e.o; }
    return node;
  });
  return { a: 1, k };
}

export const fixed = (v) => ({ a: 0, k: Array.isArray(v) ? v : v });

// opacity keyframes: fade in [inA->inB] to 100, optional fade out [outA->outB] to 0
export function fade({ inA = 0, inB, hold = 100, outA, outB, ease = "out" } = {}) {
  const stops = [];
  if (inB != null) { stops.push([inA, [0], ease]); stops.push([inB, [hold], ease]); }
  else stops.push([inA, [hold]]);
  if (outA != null && outB != null) { stops.push([outA, [hold], "in"]); stops.push([outB, [0]]); }
  return animated(stops);
}

// ---- transform block ----
export function transform({ p, a = [0, 0, 0], s = [100, 100, 100], r = 0, o = 100 } = {}) {
  return {
    o: typeof o === "object" ? o : fixed(o),
    r: typeof r === "object" ? r : fixed(r),
    p: p && typeof p === "object" && "a" in p ? p : fixed(p ?? [0, 0, 0]),
    a: fixed(a),
    s: s && typeof s === "object" && "a" in s ? s : fixed(s),
  };
}

// ---- image-asset layer (ty:2) ----
export function imageLayer({ id, refId, w, h, ip = 0, op, st = 0, ks }) {
  return { ty: 2, nm: id, refId, ip, op, st, ks };
}

export function imageAsset({ id, w, h, file }) {
  return { id, w, h, u: "", p: file, e: 0 };
}

// ---- shape primitives ----
export const rect = ({ size, pos = [0, 0], round = 0 }) =>
  ({ ty: "rc", p: fixed(pos), s: typeof size === "object" && "a" in size ? size : fixed(size), r: fixed(round) });

export const ellipse = ({ size, pos = [0, 0] }) =>
  ({ ty: "el", p: fixed(pos), s: typeof size === "object" && "a" in size ? size : fixed(size) });

export const fill = (rgba, o = 100) =>
  ({ ty: "fl", c: typeof rgba === "object" && "a" in rgba ? rgba : fixed(rgba), o: typeof o === "object" ? o : fixed(o) });

export const stroke = (rgba, width, o = 100) =>
  ({ ty: "st", c: fixed(rgba), o: typeof o === "object" ? o : fixed(o), w: typeof width === "object" ? width : fixed(width), lc: 2, lj: 2 });

// bezier path shape. pts: [[x,y, inX,inY, outX,outY], ...] tangents relative to vertex. closed default true.
export const path = ({ pts, closed = true }) => ({
  ty: "sh",
  ks: { a: 0, k: {
    c: closed,
    v: pts.map((p) => [p[0], p[1]]),
    i: pts.map((p) => [p[2] ?? 0, p[3] ?? 0]),
    o: pts.map((p) => [p[4] ?? 0, p[5] ?? 0]),
  } },
});

// trim paths (for draw-on line/stroke animation)
export const trim = ({ start = 0, end = 100, offset = 0 }) =>
  ({ ty: "tm", s: typeof start === "object" ? start : fixed(start), e: typeof end === "object" ? end : fixed(end), o: typeof offset === "object" ? offset : fixed(offset), m: 1 });

// shape-group inner transform
export const shapeTransform = ({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) =>
  ({ ty: "tr", p: typeof p === "object" && "a" in p ? p : fixed(p), a: fixed(a),
     s: typeof s === "object" && "a" in s ? s : fixed(s), r: typeof r === "object" ? r : fixed(r),
     o: typeof o === "object" ? o : fixed(o) });

export const group = (items, nm = "g") => ({ ty: "gr", nm, it: items });

// ---- shape layer (ty:4) ----
export function shapeLayer({ nm = "shape", shapes, ip = 0, op, st = 0, ks }) {
  return { ty: 4, nm, ip, op, st, ks, shapes };
}

// rgba helper from hex
export function hex(h, alpha = 1) {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16) / 255, parseInt(s.slice(2, 4), 16) / 255, parseInt(s.slice(4, 6), 16) / 255, alpha];
}

// ---- document ----
export function doc({ w = 1920, h = 1080, fr = 60, op, nm = "scene", assets = [], layers }) {
  return { v: "5.7.0", fr, ip: 0, op, w, h, nm, assets, layers };
}
