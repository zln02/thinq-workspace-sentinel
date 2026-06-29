// Render a line (or block) of text to a tight transparent PNG via CanvasKit's
// Paragraph API. Handles Korean (or any) text given a supplied .ttf. Output is
// cropped to the text bounds so it can be dropped into a Lottie image layer or
// composited directly with ffmpeg.
//
// Usage:
//   node scripts/text-to-png.mjs <out.png> --text "안녕하세요" --font assets/fonts/Malgun-Bold.ttf
//     [--size 96] [--color #111111] [--maxw 1600] [--align left|center|right]
//     [--letter -1] [--line 1.2] [--pad 8] [--meta out.json]
//
// With --meta it also writes {width,height} JSON so callers know the PNG size.

import CanvasKitInit from "canvaskit-wasm/full";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function parseArgs(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) opt[a.slice(2)] = argv[++i];
    else pos.push(a);
  }
  return { pos, opt };
}

const { pos, opt } = parseArgs(process.argv.slice(2));
const outPath = resolve(pos[0] ?? "out.png");
const text = opt.text ?? "텍스트";
const fontPath = resolve(opt.font ?? "assets/fonts/Malgun-Bold.ttf");
const size = Number(opt.size ?? 96);
const maxw = Number(opt.maxw ?? 1600);
const align = opt.align ?? "left";
const letter = opt.letter != null ? Number(opt.letter) : 0;
const lineHeight = opt.line != null ? Number(opt.line) : 1.25;
const pad = Number(opt.pad ?? 8);

function hexToRGBA(hex) {
  const h = (hex ?? "#111111").replace("#", "");
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255, 1];
}

const wasmPath = resolve(require.resolve("canvaskit-wasm/full"), "../canvaskit.wasm");
const ck = await CanvasKitInit({ locateFile: () => wasmPath });

const fontData = await readFile(fontPath);
const fontMgr = ck.FontMgr.FromData(new Uint8Array(fontData));
const familyName = fontMgr.getFamilyName(0);

const [r, g, b, a] = hexToRGBA(opt.color);
const alignMap = { left: ck.TextAlign.Left, center: ck.TextAlign.Center, right: ck.TextAlign.Right };

const paraStyle = new ck.ParagraphStyle({
  textStyle: {
    color: ck.Color4f(r, g, b, a),
    fontFamilies: [familyName],
    fontSize: size,
    letterSpacing: letter,
    heightMultiplier: lineHeight,
  },
  textAlign: alignMap[align] ?? ck.TextAlign.Left,
});

const builder = ck.ParagraphBuilder.Make(paraStyle, fontMgr);
// allow \n in --text for multi-line
builder.addText(text.replace(/\\n/g, "\n"));
const para = builder.build();
para.layout(maxw);

const textW = Math.ceil(para.getLongestLine());
const textH = Math.ceil(para.getHeight());
const W = textW + pad * 2;
const H = textH + pad * 2;

const surface = ck.MakeSurface(W, H);
const canvas = surface.getCanvas();
canvas.clear(ck.TRANSPARENT);
// when centered/right aligned, the paragraph box must be the full width
para.layout(align === "left" ? textW : W - pad * 2);
canvas.drawParagraph(para, pad, pad);
surface.flush();

const img = surface.makeImageSnapshot();
const png = img.encodeToBytes();
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, Buffer.from(png));

if (opt.meta) {
  await writeFile(resolve(opt.meta), JSON.stringify({ width: W, height: H, textWidth: textW, textHeight: textH, family: familyName }));
}

console.log(`text-to-png: "${text}" [${familyName}] -> ${outPath} (${W}x${H})`);

img.delete();
surface.delete();
para.delete();
