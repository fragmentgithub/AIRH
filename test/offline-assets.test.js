import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceWorker = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");

test("service worker revalidates code assets instead of pure cache-first", () => {
  assert.match(serviceWorker, /const isCode = request\.mode === "navigate" \|\|/);
  assert.match(serviceWorker, /if \(cached && !isCode\) return cached;/);
  assert.match(serviceWorker, /event\.waitUntil\(network\.then\(\(\) => undefined\)\);/);
  assert.doesNotMatch(serviceWorker, /if \(cached\) return cached;/);
});

test("web manifest does not claim maskable without a safe-zone icon", () => {
  const manifest = JSON.parse(fs.readFileSync(new URL("../assets/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.icons[0].purpose, "any");
});
