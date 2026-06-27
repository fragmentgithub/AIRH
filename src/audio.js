let recordedAudioManifest = {};
let manifestLoaded = false;
let activeAudio = null;

export async function loadRecordedAudioManifest(url = "./assets/audio/manifest.json") {
  if (manifestLoaded) return recordedAudioManifest;
  manifestLoaded = true;
  try {
    const response = await fetch(url, { cache: "default" });
    if (!response.ok) return recordedAudioManifest;
    recordedAudioManifest = await response.json();
  } catch (_) {
    recordedAudioManifest = {};
  }
  return recordedAudioManifest;
}

export function hasRecordedAudio(text) {
  return !!recordedAudioManifest[text];
}

export function playRecordedAudio(text, { rate = 0.95, volume = 0.9 } = {}) {
  const src = recordedAudioManifest[text];
  if (!src) return false;
  stopRecordedAudio();
  try {
    activeAudio = new Audio(new URL(src, document.baseURI).href);
    activeAudio.playbackRate = rate;
    activeAudio.volume = volume;
    activeAudio.addEventListener("ended", () => {
      activeAudio = null;
    }, { once: true });
    const playPromise = activeAudio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        activeAudio = null;
      });
    }
    return true;
  } catch (_) {
    activeAudio = null;
    return false;
  }
}

export function stopRecordedAudio() {
  if (!activeAudio) return;
  try {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  } catch (_) {}
  activeAudio = null;
}
