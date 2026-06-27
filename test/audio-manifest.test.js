import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { MODE_DEFS } from "../src/modes.js";

const manifest = JSON.parse(fs.readFileSync(new URL("../assets/audio/manifest.json", import.meta.url), "utf8"));
const source = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");

function audioPathFor(text) {
  const rel = manifest[text];
  assert.equal(typeof rel, "string", `${text} is missing from the audio manifest`);
  return new URL(`../${rel.replace(/^\.\//, "")}`, import.meta.url);
}

function assertAudioFor(text) {
  const file = audioPathFor(text);
  assert.equal(fs.existsSync(file), true, `${text} audio file is missing`);
}

test("mode speech literals have recorded audio fallbacks", () => {
  const speechTexts = Object.values(MODE_DEFS)
    .map((modeDef) => modeDef.speech)
    .filter((speech) => speech && speech !== "word" && speech !== "slow-word");

  for (const text of speechTexts) assertAudioFor(text);
});

test("variable speech messages have recorded audio fallbacks", () => {
  const wrongMessages = source.match(/const MSG_WRONG = \[([^\]]+)\]/);
  assert.ok(wrongMessages, "MSG_WRONG should remain discoverable for audio coverage");

  for (const match of wrongMessages[1].matchAll(/"([^"]+)"/g)) {
    assertAudioFor(match[1]);
  }

  assertAudioFor("かいてね");
  assertAudioFor("なぞってね");
});
