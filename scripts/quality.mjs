import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { features, infer, correct } from "../src/core.js";
const model = JSON.parse(readFileSync("src/model.json")),
  w = 192,
  h = 128;
mkdirSync("tests/fixtures/reference", { recursive: true });
function bmp(p) {
  const b = Buffer.alloc(54 + w * h * 3);
  b.write("BM");
  b.writeUInt32LE(b.length, 2);
  b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14);
  b.writeInt32LE(w, 18);
  b.writeInt32LE(-h, 22);
  b.writeUInt16LE(1, 26);
  b.writeUInt16LE(24, 28);
  for (let i = 0; i < w * h; i++) {
    b[54 + i * 3] = p[i * 4 + 2];
    b[55 + i * 3] = p[i * 4 + 1];
    b[56 + i * 3] = p[i * 4];
  }
  return b;
}
const reference = new Uint8ClampedArray(w * h * 4);
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4,
      base = 30 + (175 * x) / (w - 1),
      chroma = 25 * Math.sin((y / h) * Math.PI * 2);
    reference[i] = base + chroma;
    reference[i + 1] = base;
    reference[i + 2] = base - chroma;
    reference[i + 3] = 255;
  }
writeFileSync("tests/fixtures/reference/target.bmp", bmp(reference));
const psnr = (p) => {
  let mse = 0;
  for (let i = 0; i < p.length; i++)
    if (i % 4 !== 3) mse += (p[i] - reference[i]) ** 2;
  return 10 * Math.log10(255 ** 2 / (mse / (w * h * 3)));
};
const cases = [
  ["dark", { brightness: -0.18, contrast: 1, saturation: 1 }],
  ["bright", { brightness: 0.18, contrast: 1, saturation: 1 }],
  ["flat", { brightness: 0, contrast: 0.65, saturation: 1 }],
  ["muted", { brightness: 0, contrast: 1, saturation: 0.4 }],
  ["oversaturated", { brightness: 0, contrast: 1, saturation: 2 }],
  ["balanced", { brightness: 0, contrast: 1, saturation: 1 }],
];
const result = [];
for (const [name, p] of cases) {
  const input = reference.slice();
  correct(input, p);
  writeFileSync(`tests/fixtures/reference/${name}.bmp`, bmp(input));
  const before = psnr(input),
    parameters = infer(features(input), model);
  correct(input, parameters);
  const after = psnr(input);
  result.push({
    name,
    psnrBefore: Number.isFinite(before) ? before : null,
    psnrAfter: Number.isFinite(after) ? after : null,
    parameters,
  });
}
writeFileSync(
  "docs/quality.json",
  JSON.stringify(
    {
      note: "Procedural technical reference, not a photographic or perceptual benchmark. Null PSNR means exact match.",
      cases: result,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  result.map((r) => ({
    name: r.name,
    before: r.psnrBefore,
    after: r.psnrAfter,
  })),
);
