import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const mainSource = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");

test("UI guard unlocks are not tracked game timers", () => {
  assert.match(mainSource, /setTimeout\(\(\)=>\{\s*navLock\s*=\s*false;\s*\},\s*400\);/);
  assert.doesNotMatch(mainSource, /after\(400,\s*\(\)=>\{\s*navLock\s*=\s*false;\s*\}\);/);
  assert.match(mainSource, /setTimeout\(\(\)=>\{\s*if\(previewed\)\s*suppressClick=false;\s*\},\s*80\);/);
  assert.match(mainSource, /setTimeout\(\(\)=>\{\s*if\(done\)\s*suppressClick=false;\s*\},\s*100\);/);
});

test("question and navigation entry points clear stuck UI guards", () => {
  assert.match(mainSource, /function loadQuestion\(\)\{\s*\n\s*clearGameTimers\(\);\s*\n\s*suppressClick=false;/);
  assert.match(mainSource, /function startSet\(\)\{[\s\S]*?stopSpeaking\(\);\s*\n\s*clearGameTimers\(\);\s*\n\s*navLock=false;\s*\n\s*suppressClick=false;/);
  assert.match(mainSource, /function goHome\(\)\{[\s\S]*?clearGameTimers\(\);\s*\n\s*navLock=false;\s*\n\s*suppressClick=false;/);
});

test("ear renderer does not overwrite mode table prompt defaults", () => {
  const renderEar = mainSource.match(/function renderEar\(\)\{[\s\S]*?\n\}/)?.[0] || "";
  assert.doesNotMatch(renderEar, /\$\("prompt-text"\)\.textContent/);
  assert.doesNotMatch(renderEar, /\$\("hint-emoji"\)\.textContent/);
});
