import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const source = fs.readFileSync("src/main.js", "utf8");
const outDir = "assets/audio";
fs.mkdirSync(outDir, { recursive: true });

const texts = new Set();

const words = source.matchAll(/\{id:"[^"]+",\s*word:"([^"]+)"/g);
for (const match of words) texts.add(match[1]);

const kanaPoolMatch = source.match(/const KANA_POOL = "([^"]+)"/);
if (kanaPoolMatch) {
  for (const kana of [...kanaPoolMatch[1]]) texts.add(kana);
}

const directSpeech = source.matchAll(/\bspeak\("([^"]+)"/g);
for (const match of directSpeech) texts.add(match[1]);

texts.delete("");
texts.delete(" ");

function fileNameFor(text) {
  const codepoints = [...text].map((ch) => ch.codePointAt(0).toString(16)).join("-");
  return `u-${codepoints}.wav`;
}

const manifest = {};
const items = [...texts].sort((a, b) => a.localeCompare(b, "ja")).map((text) => {
  const file = fileNameFor(text);
  const rel = `./assets/audio/${file}`;
  manifest[text] = rel;
  return { text, path: path.resolve(outDir, file) };
});

fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const tmp = path.join(outDir, ".audio-items.json");
fs.writeFileSync(tmp, JSON.stringify(items), "utf8");

const ps = `
Add-Type -AssemblyName System.Speech
$items = Get-Content -Raw -Encoding UTF8 $env:AUDIO_ITEMS_JSON | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'ja-JP' } | Select-Object -First 1
if (-not $voice) { throw 'No ja-JP System.Speech voice is installed.' }
$synth.SelectVoice($voice.VoiceInfo.Name)
$synth.Rate = -1
foreach ($item in $items) {
  if (Test-Path -LiteralPath $item.path) { continue }
  $dir = Split-Path -Parent $item.path
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $synth.SetOutputToWaveFile($item.path)
  $synth.Speak($item.text)
  $synth.SetOutputToNull()
}
$synth.Dispose()
`;

const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], {
  stdio: "inherit",
  env: { ...process.env, AUDIO_ITEMS_JSON: path.resolve(tmp) },
});

fs.rmSync(tmp, { force: true });

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`Generated ${items.length} audio manifest entries in ${outDir}`);
