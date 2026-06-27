export const HOME_MODE_KEYS = ["cards", "cards3", "trace", "clap", "mirror", "teach", "ear"];

export const HOME_MODE_OPTIONS = {
  cards: { mode: "cards", cardLevel: 0 },
  cards3: { mode: "cards", cardLevel: 3 },
  trace: { mode: "trace", cardLevel: 0 },
  clap: { mode: "clap", cardLevel: 0 },
  mirror: { mode: "mirror", cardLevel: 0 },
  teach: { mode: "teach", cardLevel: 0 },
  ear: { mode: "ear", cardLevel: 0 },
};

export const MODE_AREA_IDS = ["cards-area", "trace-area", "clap-area", "mirror-area", "ear-area"];

export const MODE_DEFS = {
  cards: {
    areas: ["cards-area"],
    slots: true,
    listen: true,
    redo: true,
    reward: true,
    prompt: "これ な〜に？",
    hint: "emoji",
    renderer: "choices",
    speech: "word",
  },
  trace: {
    areas: ["trace-area"],
    slots: true,
    listen: true,
    redo: false,
    reward: true,
    prompt: "これ な〜に？",
    hint: "emoji",
    renderer: "trace",
    speech: "word",
  },
  clap: {
    areas: ["clap-area"],
    slots: false,
    listen: false,
    redo: false,
    reward: false,
    prompt: "なんかい たたく？",
    hint: "emoji",
    renderer: "clap",
    speech: "word",
  },
  mirror: {
    areas: ["mirror-area"],
    slots: false,
    listen: false,
    redo: false,
    reward: false,
    prompt: "ただしいの どっち？",
    hint: "↔",
    hintLabel: "むき",
    renderer: "mirror",
    speech: "どっちかな",
    speechRate: 0.9,
  },
  teach: {
    areas: ["cards-area"],
    slots: true,
    listen: true,
    redo: false,
    reward: false,
    prompt: "ひよこに おしえて",
    hint: "emoji",
    renderer: "teach",
    speech: "word",
  },
  ear: {
    areas: ["ear-area"],
    slots: false,
    listen: false,
    redo: false,
    reward: false,
    prompt: "きいて えらぼう",
    hint: "👂",
    hintLabel: "おみみ",
    renderer: "ear",
    speech: "slow-word",
  },
};

export const VALID_MODES = Object.keys(MODE_DEFS);

export function modeDefFor(mode) {
  return MODE_DEFS[mode] || MODE_DEFS.cards;
}

export function normalizeHomeModes(value) {
  const set = new Set(Array.isArray(value) ? value : HOME_MODE_KEYS);
  const modes = HOME_MODE_KEYS.filter((key) => set.has(key));
  return modes.length ? modes : ["cards"];
}

export function homeModeKeyFor(mode, cardLevel = 0) {
  if (mode === "cards" && Number(cardLevel) === 3) return "cards3";
  return HOME_MODE_KEYS.find((key) => key !== "cards3" && HOME_MODE_OPTIONS[key].mode === mode) || "cards";
}

export function modeReceivesProgressReward(mode) {
  return !!modeDefFor(mode).reward;
}
