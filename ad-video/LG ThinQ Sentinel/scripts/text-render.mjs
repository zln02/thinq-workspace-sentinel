// Shared text->PNG renderer (CanvasKit Paragraph). Returns a tight transparent
// PNG buffer plus its pixel dimensions, so callers can size Lottie image assets.
import { readFile } from "node:fs/promises";

const fontCache = new Map();

export async function loadFontMgr(ck, fontPath) {
  if (fontCache.has(fontPath)) return fontCache.get(fontPath);
  const data = await readFile(fontPath);
  const mgr = ck.FontMgr.FromData(new Uint8Array(data));
  fontCache.set(fontPath, mgr);
  return mgr;
}

function hexToRGBA(ck, hex, alpha = 1) {
  const h = (hex ?? "#111111").replace("#", "");
  return ck.Color4f(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255, alpha);
}

// opts: { text, fontPath, size, color, maxw, align, letter, line, pad }
export async function renderText(ck, opts) {
  const {
    text, fontPath, size = 96, color = "#111111", maxw = 1800,
    align = "left", letter = 0, line = 1.25, pad = 10,
  } = opts;

  const fontMgr = await loadFontMgr(ck, fontPath);
  const family = fontMgr.getFamilyName(0);
  const alignMap = { left: ck.TextAlign.Left, center: ck.TextAlign.Center, right: ck.TextAlign.Right };

  const paraStyle = new ck.ParagraphStyle({
    textStyle: {
      color: hexToRGBA(ck, color),
      fontFamilies: [family],
      fontSize: size,
      letterSpacing: letter,
      heightMultiplier: line,
    },
    textAlign: alignMap[align] ?? ck.TextAlign.Left,
  });

  const builder = ck.ParagraphBuilder.Make(paraStyle, fontMgr);
  builder.addText(String(text).replace(/\\n/g, "\n"));
  const para = builder.build();
  para.layout(maxw);

  const textW = Math.ceil(para.getLongestLine());
  const textH = Math.ceil(para.getHeight());
  const W = textW + pad * 2;
  const H = textH + pad * 2;

  const surface = ck.MakeSurface(W, H);
  const canvas = surface.getCanvas();
  canvas.clear(ck.TRANSPARENT);
  para.layout(align === "left" ? textW : W - pad * 2);
  canvas.drawParagraph(para, pad, pad);
  surface.flush();

  const img = surface.makeImageSnapshot();
  const buffer = Buffer.from(img.encodeToBytes());
  img.delete(); surface.delete(); para.delete(); builder.delete?.();

  return { buffer, width: W, height: H, family };
}
