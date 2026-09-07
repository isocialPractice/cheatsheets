// Dependency free checks that favicon.ico is a real icon rather than a PNG
// under an icon's name. Run with: node --test tools/test-favicon.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ico = readFileSync(join(root, "favicon.ico"));
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Parse the ICONDIR and its ICONDIRENTRY table, per the ICO container format.
function readFrames(buffer) {
  const count = buffer.readUInt16LE(4);
  const frames = [];
  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16;
    frames.push({
      // A zero byte in either dimension means 256, which no frame here uses.
      width: buffer[entry] === 0 ? 256 : buffer[entry],
      height: buffer[entry + 1] === 0 ? 256 : buffer[entry + 1],
      colorCount: buffer[entry + 2],
      bytes: buffer.readUInt32LE(entry + 8),
      offset: buffer.readUInt32LE(entry + 12),
    });
  }
  return frames;
}

test("favicon.ico is an icon, not a PNG wearing the name", () => {
  assert.ok(
    !ico.subarray(0, 8).equals(PNG_MAGIC),
    "favicon.ico still begins with the PNG signature"
  );
  assert.equal(ico.readUInt16LE(0), 0, "reserved field must be zero");
  assert.equal(ico.readUInt16LE(2), 1, "image type must be 1 for an icon");
});

test("it carries the 16, 32 and 48 pixel frames browsers ask for", () => {
  const frames = readFrames(ico);
  assert.equal(frames.length, 3);
  assert.deepEqual(
    frames.map((f) => f.width),
    [16, 32, 48]
  );
});

test("every frame is square, so no browser rescales a lopsided icon", () => {
  for (const frame of readFrames(ico)) {
    assert.equal(
      frame.width,
      frame.height,
      `frame ${frame.width}x${frame.height} is not square`
    );
  }
});

test("every frame's pixel data lies inside the file", () => {
  for (const frame of readFrames(ico)) {
    assert.ok(frame.bytes > 0, `frame ${frame.width} declares no data`);
    assert.ok(
      frame.offset + frame.bytes <= ico.length,
      `frame ${frame.width} runs past the end of the file`
    );
  }
});

test("the head declares the icon it actually ships", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const head = html.slice(0, html.indexOf("</head>"));
  const link = head.match(/<link\s+rel="icon"[^>]*>/);

  assert.ok(link, "expected a rel=icon link in the head");
  // "any" claims a scalable icon, which an ICO of fixed frames is not.
  assert.doesNotMatch(link[0], /sizes="any"/);
  assert.match(link[0], /sizes="16x16 32x32 48x48"/);
  assert.match(link[0], /type="image\/vnd\.microsoft\.icon"/);
});

test("the artwork the design language measures is still in the repository", () => {
  const mark = readFileSync(join(root, "mark.png"));
  assert.ok(
    mark.subarray(0, 8).equals(PNG_MAGIC),
    "mark.png should be a PNG"
  );
  // DESIGN_LANGUAGE.md counts its palette over a 417x418 mark; the IHDR
  // dimensions are what make those counts checkable.
  assert.equal(mark.readUInt32BE(16), 417);
  assert.equal(mark.readUInt32BE(20), 418);
});
