import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const cssSource = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const mainSource = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");

test("hidden controls are actually removed from visual layout", () => {
  assert.match(cssSource, /\[hidden\]\s*\{\s*display\s*:\s*none\s*!important;\s*\}/);
});

test("secondary listening control keeps a child-sized touch target", () => {
  assert.match(cssSource, /\.listen-btn\s*\{[\s\S]*?min-height\s*:\s*44px/);
});

test("trace completion button is unavailable until tracing is ready", () => {
  assert.match(htmlSource, /id="trace-done-btn"[^>]*aria-disabled="true"[^>]*disabled/);
  assert.match(mainSource, /btn\.disabled\s*=\s*!ready;/);
  assert.match(mainSource, /btn\.textContent\s*=\s*ready\s*\?\s*"できた"\s*:\s*"なぞってね";/);
});

test("parent sheet has an always-visible close control near the title", () => {
  assert.match(htmlSource, /id="sheet-close-top"/);
  assert.match(mainSource, /\$\("sheet-close-top"\)\.addEventListener\("click",\s*closeParents\);/);
});
