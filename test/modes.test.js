import test from "node:test";
import assert from "node:assert/strict";
import {
  HOME_MODE_KEYS,
  modeDefFor,
  homeModeKeyFor,
  modeReceivesProgressReward,
  normalizeHomeModes,
} from "../src/modes.js";

test("normalizes home modes to known ordered keys", () => {
  assert.deepEqual(normalizeHomeModes(["ear", "cards", "missing", "trace"]), ["cards", "trace", "ear"]);
  assert.deepEqual(normalizeHomeModes([]), ["cards"]);
  assert.deepEqual(normalizeHomeModes(null), HOME_MODE_KEYS);
});

test("derives the home mode key from mode and card level", () => {
  assert.equal(homeModeKeyFor("cards", 0), "cards");
  assert.equal(homeModeKeyFor("cards", 3), "cards3");
  assert.equal(homeModeKeyFor("trace", 0), "trace");
  assert.equal(homeModeKeyFor("unknown", 0), "cards");
});

test("progress reward is limited to card and trace modes", () => {
  assert.equal(modeReceivesProgressReward("cards"), true);
  assert.equal(modeReceivesProgressReward("trace"), true);
  assert.equal(modeReceivesProgressReward("ear"), false);
  assert.equal(modeReceivesProgressReward("mirror"), false);
});

test("mode definitions describe required UI contracts", () => {
  assert.deepEqual(modeDefFor("ear").areas, ["ear-area"]);
  assert.equal(modeDefFor("ear").speech, "slow-word");
  assert.equal(modeDefFor("mirror").speech, "どっちかな");
  assert.equal(modeDefFor("missing").renderer, "choices");
});
