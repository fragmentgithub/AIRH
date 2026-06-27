import {
  HOME_MODE_KEYS,
  HOME_MODE_OPTIONS,
  MODE_AREA_IDS,
  VALID_MODES,
  homeModeKeyFor,
  modeDefFor,
  modeReceivesProgressReward,
  normalizeHomeModes,
} from "./modes.js";
import { loadRecordedAudioManifest, playRecordedAudio, stopRecordedAudio } from "./audio.js";
import { after, cancelAfter, cancelAllPending } from "./timers.js";

"use strict";
/* ============================================================
   ひらがな ことばあそび
   no-build ES module — extracted from index.html
   ============================================================ */

/* ---------- word data ----------------------------------------
   rules from spec: 2-letter focus, no 濁点/半濁点/小書き at start,
   don't crowd look-alike kana, 4 choices (5 for 3-letter).
   cards are NOT consumed on tap, so repeats (もも, とまと) work.
------------------------------------------------------------- */
const WORDS = [
  // --- level 1 : 2 letters, clear shapes ---
  {id:"neko", word:"ねこ", emoji:"🐱", level:1, choices:["ね","こ","あ","ま"]},
  {id:"inu",  word:"いぬ", emoji:"🐶", level:1, choices:["い","ぬ","も","か"]},
  {id:"kuma", word:"くま", emoji:"🐻", level:1, choices:["く","ま","と","ゆ"]},
  {id:"momo", word:"もも", emoji:"🍑", level:1, choices:["も","て","き","さ"]},
  {id:"ushi", word:"うし", emoji:"🐮", level:1, choices:["う","し","な","ろ"]},
  {id:"kani", word:"かに", emoji:"🦀", level:1, choices:["か","に","ほ","め"]},
  {id:"fune", word:"ふね", emoji:"⛵", level:1, choices:["ふ","ね","さ","ち"]},
  {id:"tsuki",word:"つき", emoji:"🌙", level:1, choices:["つ","き","は","の"]},
  {id:"hoshi",word:"ほし", emoji:"⭐", level:1, choices:["ほ","し","ら","ぬ"]},
  {id:"tori", word:"とり", emoji:"🐦", level:1, choices:["と","り","ぬ","さ"]},
  {id:"uma",  word:"うま", emoji:"🐴", level:1, choices:["う","ま","け","の"]},
  {id:"kutsu",word:"くつ", emoji:"👟", level:1, choices:["く","つ","ほ","め"]},
  {id:"kasa", word:"かさ", emoji:"☔", level:1, choices:["か","さ","も","ね"]},
  {id:"yama", word:"やま", emoji:"🗻", level:1, choices:["や","ま","こ","す"]},
  {id:"mimi", word:"みみ", emoji:"👂", level:1, choices:["み","ろ","け","ふ"]},
  {id:"tako", word:"たこ", emoji:"🐙", level:1, choices:["た","こ","ぬ","り"]},
  {id:"yuki", word:"ゆき", emoji:"❄️", level:1, choices:["ゆ","き","ら","そ"]},
  {id:"ari",  word:"あり", emoji:"🐜", level:1, choices:["あ","り","ぬ","け"]},
  {id:"kuri", word:"くり", emoji:"🌰", level:1, choices:["く","り","ち","ね"]},
  // --- level 2 : 2 letters, a few look-/sound-alikes mixed in (at most one shape-twin per set) ---
  {id:"hana", word:"はな", emoji:"🌸", level:2, choices:["は","な","ほ","き"]},
  {id:"ame",  word:"あめ", emoji:"🍬", level:2, choices:["あ","め","ぬ","き"]},
  {id:"umi",  word:"うみ", emoji:"🌊", level:2, choices:["う","み","つ","ら"]},
  {id:"kumo", word:"くも", emoji:"☁️", level:2, choices:["く","も","ち","せ"]},
  {id:"saru", word:"さる", emoji:"🐵", level:2, choices:["さ","る","ま","に"]},
  {id:"sushi",word:"すし", emoji:"🍣", level:2, choices:["す","し","ち","な"]},
  {id:"hon",  word:"ほん", emoji:"📖", level:2, choices:["ほ","ん","は","て"]},
  // --- level 3 : 3 letters, 5 choices ---
  {id:"sakana",word:"さかな", emoji:"🐟", level:3, choices:["さ","か","な","ま","ち"]},
  {id:"kuruma",word:"くるま", emoji:"🚗", level:3, choices:["く","る","ま","か","ろ"]},
  {id:"suika", word:"すいか", emoji:"🍉", level:3, choices:["す","い","か","し","ん"]},
  {id:"mikan", word:"みかん", emoji:"🍊", level:3, choices:["み","か","ん","め","は"]},
  {id:"tomato",word:"とまと", emoji:"🍅", level:3, choices:["と","ま","ち","ね","ゆ"]},
  {id:"hiyoko", word:"ひよこ", emoji:"🐤", level:3, choices:["ひ","よ","こ","ち","ま"]},
  {id:"kirin",  word:"きりん", emoji:"🦒", level:3, choices:["き","り","ん","に","は"]},
  {id:"kitsune",word:"きつね", emoji:"🦊", level:3, choices:["き","つ","ね","め","さ"]},
  {id:"kaeru",  word:"かえる", emoji:"🐸", level:3, choices:["か","え","る","ろ","ち"]},
  {id:"koala",  word:"こあら", emoji:"🐨", level:3, choices:["こ","あ","ら","お","て"]},
  {id:"kinoko", word:"きのこ", emoji:"🍄", level:3, choices:["き","の","こ","さ","ち"]},
  {id:"tokei",  word:"とけい", emoji:"⏰", level:3, choices:["と","け","い","ち","ね"]},
  {id:"taiko",  word:"たいこ", emoji:"🥁", level:3, choices:["た","い","こ","け","ら"]},
  {id:"ahiru",  word:"あひる", emoji:"🦆", level:3, choices:["あ","ひ","る","わ","け"]},
  {id:"asahi",  word:"あさひ", emoji:"🌅", level:3, choices:["あ","さ","ひ","ま","こ"]},
  {id:"ofuro",  word:"おふろ", emoji:"🛁", level:3, choices:["お","ふ","ろ","ほ","め"]},
  {id:"hasami", word:"はさみ", emoji:"✂️", level:3, choices:["は","さ","み","ほ","き"]},
  {id:"koinu",  word:"こいぬ", emoji:"🐕", level:3, choices:["こ","い","ぬ","の","め"]},
];

const SET_SIZE = 5;
const KANA_POOL = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".split("");
const LOOKALIKES = [["ね","れ","わ"],["は","ほ","ま"],["さ","き","ち"],["ぬ","め","ね"],["る","ろ"],["つ","う"]];
const CUSTOM_EMOJIS = ["😊","⭐","🌸","🚗","🐶","🐱","🐰","🍎","🍙","🏠","🎂","🧸"];
const PROFILE_EMOJIS = ["🐥","🐰","🐼","🦊","🐸","🐨"];
const MIRROR_KANA = "くこしつてとひふへみもやゆよらりるろん".split("");
const MOUTH = {
  a:{shape:"😮", sound:"あ"}, i:{shape:"😁", sound:"い"}, u:{shape:"🫧", sound:"う"},
  e:{shape:"🙂", sound:"え"}, o:{shape:"⭕", sound:"お"}
};
const MSG_WRONG = ["もういっかい","こっちかな？","よくみてみよう"];
const MSG_RIGHT = ["できたね！","やったね！","すごい！"];

/* ---------- persistent state -------------------------------- */
const BASE_STORE_KEY = "hiragana-asobi-v1";
const PROFILE_KEY = BASE_STORE_KEY+"-profiles";
function loadProfiles(){
  try{
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if(p && Array.isArray(p.items) && p.items.length){
      if(!p.items.some(it=>it && it.id===p.current)) p.current = p.items[0].id;
      return p;
    }
  }catch(e){}
  return {current:"p1", items:[{id:"p1", emoji:"🐥"}]};
}
let profiles = loadProfiles();
let activeProfileId = profiles.current || "p1";
function saveProfiles(){
  profiles.current = activeProfileId;
  try{ localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles)); }catch(e){}
}
function storeKey(){ return BASE_STORE_KEY+"-"+activeProfileId; }
function defaultStore(){
  return {
    date:todayStr(), todayStamps:0, soundOn:true, played:0, correct:0,
    playedMs:0, limitMin:15, timerDefaultV2:true, mode:"cards", cardLevel:0, calm:false, bigTargets:false, lefty:false,
    homeModes:["cards"],
    friends:[], customWords:[], history:[], misses:{}, lastFriend:""
  };
}
function todayStr(){ const d=new Date(); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
let migratedLegacy = false;
let storageOk = true;
function loadStore(){
  let s={};
  try{ s = JSON.parse(localStorage.getItem(storeKey())) || {}; }catch(e){ s={}; }
  if(!Object.keys(s).length && activeProfileId==="p1"){
    try{ s = JSON.parse(localStorage.getItem(BASE_STORE_KEY)) || {}; }catch(e){ s={}; }
    if(Object.keys(s).length) migratedLegacy = true;
  }
  const hadTimerDefaultV2 = s.timerDefaultV2 === true;
  const savedLimitMin = s.limitMin;
  s = Object.assign(defaultStore(), s);
  if(s.date !== todayStr()){ s.date = todayStr(); s.todayStamps = 0; s.playedMs = 0; }
  if(typeof s.todayStamps !== "number") s.todayStamps = 0;
  if(typeof s.soundOn !== "boolean") s.soundOn = true;
  if(typeof s.played !== "number") s.played = 0;
  if(typeof s.correct !== "number") s.correct = 0;
  if(typeof s.playedMs !== "number") s.playedMs = 0;
  if(typeof s.limitMin !== "number" || ![0,5,10,15].includes(s.limitMin)) s.limitMin = 15;
  if(!hadTimerDefaultV2 && savedLimitMin === 0) s.limitMin = 15;
  s.timerDefaultV2 = true;
  if(!VALID_MODES.includes(s.mode)) s.mode = "cards";
  s.cardLevel = Number(s.cardLevel) === 3 ? 3 : 0;
  if(s.mode !== "cards") s.cardLevel = 0;
  s.homeModes = normalizeHomeModes(s.homeModes);
  if(!Array.isArray(s.friends)) s.friends = [];
  if(!Array.isArray(s.customWords)) s.customWords = [];
  else{
    const seenEmoji = new Set(), seenWord = new Set(), cleaned = [];
    for(let i=s.customWords.length-1;i>=0;i--){
      const w=s.customWords[i];
      if(!w || !validCustomWord(w.word) || !w.emoji) continue;
      if(seenEmoji.has(w.emoji) || seenWord.has(w.word)) continue;
      seenEmoji.add(w.emoji); seenWord.add(w.word);
      cleaned.unshift({
        id:w.id || ("custom-"+i+"-"+w.word),
        word:w.word,
        emoji:w.emoji,
        level:1,
        choices:Array.isArray(w.choices) && w.choices.length ? w.choices : buildChoices(w.word)
      });
    }
    s.customWords = cleaned.slice(-12);
  }
  if(!Array.isArray(s.history)) s.history = [];
  if(!s.misses || typeof s.misses !== "object") s.misses = {};
  if(typeof s.calm !== "boolean") s.calm = false;
  if(typeof s.bigTargets !== "boolean") s.bigTargets = false;
  if(typeof s.lefty !== "boolean") s.lefty = false;
  return s;
}
function saveStore(){
  try{ localStorage.setItem(storeKey(), JSON.stringify(store)); storageOk = true; }
  catch(e){ storageOk = false; }
}
let store = loadStore();
try{
  localStorage.setItem(BASE_STORE_KEY+"-probe","1");
  localStorage.removeItem(BASE_STORE_KEY+"-probe");
}catch(e){ storageOk = false; }
saveStore(); // persist a possible date-rollover reset immediately
if(migratedLegacy && storageOk){ try{ localStorage.removeItem(BASE_STORE_KEY); }catch(e){} }

/* ---------- run-time state ---------------------------------- */
let queue = [];          // 5 questions for this set
let qIndex = 0;          // index within set
let current = null;      // current word object
let selected = [];       // chosen letters
let wrongCount = 0;      // wrong completes this question (for hint)
let setStamps = 0;       // hanamaru earned this set
let locked = false;      // ignore taps during transitions
let setMisses = [];
let clapCount = 0, teachIndex = -1, mirrorAnswer = "", mirrorTarget = "";
let suppressClick = false, peepTimer = null, mouthTimer = null, traceDemoTimer = null, traceDemoFrame = null;
let solveTimer = null, navLock = false;
let playTick = null, tickStart = 0;

function clearSolveTimer(){
  if(solveTimer){
    cancelAfter(solveTimer);
    solveTimer = null;
  }
}
function scheduleSolve(fn, delay){
  clearSolveTimer();
  solveTimer = after(delay, ()=>{
    solveTimer = null;
    fn();
  });
}

function checkpointPlay(){
  if(!tickStart) return;
  const now = Date.now();
  if(store.date !== todayStr()){
    store.date = todayStr(); store.todayStamps = 0; store.playedMs = 0;
    tickStart = now; saveStore(); return;
  }
  store.playedMs += now - tickStart;
  tickStart = now;
  saveStore();
}
function startPlayClock(){
  if(store.limitMin <= 0 || playTick) return;
  tickStart = Date.now();
  playTick = setInterval(checkpointPlay, 5000);
}
function stopPlayClock(){
  if(playTick){
    checkpointPlay();
    clearInterval(playTick);
    playTick = null;
  }
  tickStart = 0;
}
function timeUp(){
  return store.limitMin > 0 && store.playedMs >= store.limitMin * 60000;
}
function playScreenActive(){
  return screens.quiz.classList.contains("is-active") || screens.success.classList.contains("is-active");
}
function formatPlaytime(){
  return Math.round(store.playedMs / 60000) + "分";
}

function registerServiceWorker(){
  if(!("serviceWorker" in navigator) || location.protocol === "file:") return;
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}

/* handwriting (trace) mode state */
const PAD = 300;         // internal canvas resolution
const BRUSH = 28;        // ink stroke width
const TRACE_HINT_MS = 8000;
const TRACE_RELAX_MS = 16000;
const TRACE_AUTO_MS = 24000;
const TRACE_MIN_STROKE_PX = 26;  // PAD(300) units; shorter drawn length = stray tap, ignored
const TRACE_MIN_COVERAGE = 0.08; // loose glyph coverage; timed unlock still prevents dead ends
let padCtx = null, padGuideCtx = null;
let guidePts = [];       // sampled glyph pixels of the current char
let guideArea = 0;
let drawing = false, traceBusy = false;
let traceTimers = [];
let curStrokeLen = 0;
let totalTraceLen = 0;
let traceDoneUnlocked = false;
let lastXY = [0,0];

/* ---------- elements ---------------------------------------- */
const $ = (id)=>document.getElementById(id);
const screens = {
  home:$("screen-home"), quiz:$("screen-quiz"),
  success:$("screen-success"), end:$("screen-end"), rest:$("screen-rest"),
};
function show(name){
  for(const k in screens) screens[k].classList.toggle("is-active", k===name);
  window.scrollTo(0,0); // start each screen from the top
}
function clearGameTimers(){
  cancelAllPending();
  clearSolveTimer();
  clearTraceHelp();
  clearSlowSpeak();
  peepTimer = null;
  mouthTimer = null;
}

/* ---------- hanamaru SVG (the signature) --------------------
   花丸 = a scalloped flower-circle teachers draw on good work.
   scallop() builds a petal-edged circle path so both shapes are crisp.
------------------------------------------------------------- */
function scallop(cx,cy,r,n,amp){
  let d=`M ${(cx+r).toFixed(1)} ${cy.toFixed(1)} `;
  for(let i=0;i<n;i++){
    const am=((i+0.5)/n)*2*Math.PI, a1=((i+1)/n)*2*Math.PI;
    const cpx=cx+(r+amp)*Math.cos(am), cpy=cy+(r+amp)*Math.sin(am);
    const x1=cx+r*Math.cos(a1), y1=cy+r*Math.sin(a1);
    d+=`Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)} `;
  }
  return d+"Z";
}
/* small filled badge — collected stamps (tray, +1, end row) */
function hanaBadge(){
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="${scallop(50,50,33,10,9)}" fill="#FFC4D2" stroke="#F0506E" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="12" fill="#FFE6A8" stroke="#F0506E" stroke-width="5"/>
  </svg>`;
}
/* big ring — drawn AROUND the finished word, transparent centre */
function hanaRing(){
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="${scallop(60,60,50,12,7)}" fill="none" stroke="#F0506E" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="60" cy="60" r="40" fill="none" stroke="#F0506E" stroke-width="4.5"/>
  </svg>`;
}

/* ---------- audio: Web Speech + tiny WebAudio blips ---------- */
let jaVoice = null;
/* Standalone single kana otherwise read as grammatical particles (は→wa, へ→e,
   を→o). Applied ONLY to length-1 utterances; multi-kana words are untouched so
   normal phonology still applies. Safari Web Speech has no SSML, so substitute
   katakana the engine reads literally. */
const KANA_SAY = { "は":"ハ", "へ":"ヘ", "を":"ヲ" };
function sayText(text){
  return (text && text.length===1 && KANA_SAY[text]) ? KANA_SAY[text] : text;
}
/* rank ja voices for what the device exposes: iOS has only LOCAL Apple ja voices
   (Kyoko/O-ren/Siri 日本語); desktop/Edge may add Google/Natural. */
function scoreVoice(v){
  const n=(v.name||"").toLowerCase();
  let s=0;
  if(/natural|neural/.test(n)) s+=120;                 // Edge/MS neural (desktop)
  if(/google/.test(n))         s+=80;                  // "Google 日本語" (Chrome/Android)
  if(/online/.test(n))         s+=40;
  if(/kyoko|o-?ren|otoya|siri|hattori|sara/.test(n)) s+=60; // Apple iOS/macOS ja
  if(/nanami|ayumi|sayaka|mayu|aoi|nozomi|keita|masaru|haruka/.test(n)) s+=30;
  if(/^ja-jp$/i.test(v.lang||"")) s+=10;               // exact region over generic "ja"
  if(!v.localService)          s+=2;                   // mild tie-breaker only
  return s;
}
function pickVoice(){
  if(!("speechSynthesis" in window)) return false;
  const ja = speechSynthesis.getVoices().filter(v=>/^ja\b|^ja[-_]/i.test(v.lang));
  if(!ja.length) return false;              // don't null a previously found voice
  ja.sort((a,b)=>scoreVoice(b)-scoreVoice(a));
  jaVoice = ja[0];
  return true;
}
function pickVoiceRetry(tries){             // iOS: getVoices() is empty/late, onvoiceschanged flaky
  if(pickVoice() || tries<=0) return;
  setTimeout(()=>pickVoiceRetry(tries-1), 250);
}
if("speechSynthesis" in window){
  pickVoiceRetry(10);                       // up to ~2.5s
  speechSynthesis.onvoiceschanged = pickVoice;
}
let speechPrimed = false, speechSeq = 0, slowSpeakTimers = [];
function clearSlowSpeak(){
  slowSpeakTimers.forEach(cancelAfter);
  slowSpeakTimers = [];
}
function primeSpeech(){
  loadRecordedAudioManifest();
  if(!("speechSynthesis" in window)) return;
  if(!jaVoice) pickVoice();                 // iOS often populates voices on the first gesture
  if(speechPrimed || !store.soundOn) return;
  speechPrimed = true;
  try{
    const u = new SpeechSynthesisUtterance(" ");
    u.lang = "ja-JP";
    if(jaVoice) u.voice = jaVoice;
    u.volume = 0;
    speechSynthesis.speak(u);
    setTimeout(pickVoice, 0);
  }catch(e){}
}
function speak(text, rate){
  if(!store.soundOn) return;
  const voiceRate = rate || 0.95;
  if(!("speechSynthesis" in window)){
    playRecordedAudio(text, { rate: voiceRate });
    return;
  }
  try{
    if(!jaVoice) pickVoice();              // last-chance resolve (iOS late voices)
    if(!jaVoice && playRecordedAudio(text, { rate: voiceRate })) return;
    const seq = ++speechSeq;
    const busy = speechSynthesis.speaking || speechSynthesis.pending;
    if(busy) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(sayText(text));
    u.lang = "ja-JP";
    if(jaVoice) u.voice = jaVoice;
    u.rate = voiceRate;  // natural speed
    u.pitch = 1.0;          // natural pitch (was 1.15 — sounded squeaky)
    u.volume = 0.9;
    const fire = ()=>{
      if(seq !== speechSeq || !store.soundOn) return;
      try{ speechSynthesis.resume(); }catch(e){}
      speechSynthesis.speak(u);
    };
    if(busy) setTimeout(fire, 60); else fire();
  }catch(e){
    playRecordedAudio(text, { rate: voiceRate });
  }
}
function stopSpeaking(){
  clearSlowSpeak();
  stopRecordedAudio();
  speechSeq++;
  if(!("speechSynthesis" in window)) return;
  try{ speechSynthesis.cancel(); }catch(e){}
}
let actx = null;
function blip(kind){
  if(!store.soundOn) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==="suspended") actx.resume();
    const now = actx.currentTime;
    const notes = kind==="good" ? (store.calm ? [659] : [523,659,784,1047]) : [440];
    notes.forEach((f,i)=>{
      const o=actx.createOscillator(), g=actx.createGain();
      o.type="sine"; o.frequency.value=f;
      const t=now+i*0.09;
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(kind==="good"?0.14:0.10, t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t+0.18);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t+0.2);
    });
  }catch(e){}
}

function allWords(){
  return WORDS.concat((store.customWords||[]).map(w=>Object.assign({level:1, custom:true}, w)));
}
function wordById(id){
  return allWords().find(w=>w.id===id);
}
function clusterMates(kana){
  const out = new Set();
  for(const c of LOOKALIKES) if(c.includes(kana)) c.forEach(k=>out.add(k));
  return out;
}
function buildChoices(word){
  const letters = [...new Set(word.split(""))];
  const banned = new Set();
  letters.forEach(l => clusterMates(l).forEach(k => banned.add(k)));
  const need = Math.max(4, Math.min(6, letters.length+2));
  const picked = [];
  for(const k of shuffle(KANA_POOL.filter(k=>!letters.includes(k) && !banned.has(k)))){
    if(picked.some(p => clusterMates(p).has(k))) continue;
    picked.push(k);
    if(letters.length + picked.length >= need) break;
  }
  const out = letters.concat(picked);
  if(out.length < need){
    for(const k of shuffle(KANA_POOL.filter(x=>!out.includes(x)))){
      out.push(k);
      if(out.length >= need) break;
    }
  }
  return out.slice(0, need);
}
function validCustomWord(word){
  return /^[あ-ん]{2,4}$/.test(word) && [...word].every(ch=>KANA_POOL.includes(ch));
}
function applyPrefs(){
  document.body.classList.toggle("calm", store.calm);
  document.body.classList.toggle("big-targets", store.bigTargets);
  document.body.classList.toggle("lefty", store.lefty);
}
function setPeepMood(mood){
  const p=$("peep"); if(!p) return;
  p.classList.remove("is-peek","is-think","is-happy");
  if(peepTimer) cancelAfter(peepTimer);
  if(mood){
    p.classList.add("is-"+mood);
    peepTimer=after(600, ()=>{
      peepTimer=null;
      p.classList.remove("is-"+mood);
    });
  }
}
function vowelOf(kana){
  if("あかさたなはまやらわ".includes(kana)) return "a";
  if("いきしちにひみり".includes(kana)) return "i";
  if("うくすつぬふむゆる".includes(kana)) return "u";
  if("えけせてねへめれ".includes(kana)) return "e";
  return "o";
}
function showMouthCue(kana){
  const cue=$("mouth-cue"); if(!cue || !kana || kana.length!==1) return;
  const v=MOUTH[vowelOf(kana)];
  cue.textContent = v.shape;
  cue.classList.add("is-on");
  if(mouthTimer) cancelAfter(mouthTimer);
  mouthTimer=after(700, ()=>{
    mouthTimer=null;
    cue.classList.remove("is-on");
  });
}
function speakKana(kana){
  showMouthCue(kana);
  speak(kana, 0.8);
}
function speakWordSlow(word){
  clearSlowSpeak();
  const chars = [...word];
  if(!chars.length) return;
  speakKana(chars[0]);
  chars.slice(1).forEach((ch,i)=>slowSpeakTimers.push(after((i+1)*520, ()=>speakKana(ch))));
}
function bindPreview(el, textFn){
  if(el.dataset.previewBound){
    if(typeof textFn !== "function") el.dataset.previewText = textFn;
    return;
  }
  el.dataset.previewBound = "1";
  if(typeof textFn !== "function") el.dataset.previewText = textFn;
  let timer=null, previewed=false;
  el.addEventListener("pointerdown", e=>{
    previewed=false;
    timer=after(450, ()=>{
      timer=null;
      previewed=true; suppressClick=true;
      const t=typeof textFn==="function"?textFn():(el.dataset.previewText || textFn);
      if(t && t.length===1) speakKana(t); else if(t) speak(t);
    });
  });
  const cancel=()=>{ if(timer){ cancelAfter(timer); timer=null; } setTimeout(()=>{ if(previewed) suppressClick=false; }, 80); };
  el.addEventListener("pointerup", cancel);
  el.addEventListener("pointerleave", cancel);
  el.addEventListener("pointercancel", cancel);
  el.addEventListener("contextmenu", e=>e.preventDefault());
  el.addEventListener("click", e=>{
    if(previewed){ e.preventDefault(); e.stopImmediatePropagation(); previewed=false; }
  }, true);
}
function startDwell(el, letter){
  if(!store.bigTargets || locked) return false;
  let done=false;
  const timer=after(700, ()=>{
    done=true; suppressClick=true; el.classList.remove("is-dwell"); tapLetter(letter);
  });
  el.classList.add("is-dwell");
  const cancel=()=>{
    cancelAfter(timer); el.classList.remove("is-dwell");
    setTimeout(()=>{ if(done) suppressClick=false; }, 100);
    el.removeEventListener("pointerup", cancel);
    el.removeEventListener("pointerleave", cancel);
    el.removeEventListener("pointercancel", cancel);
  };
  el.addEventListener("pointerup", cancel);
  el.addEventListener("pointerleave", cancel);
  el.addEventListener("pointercancel", cancel);
  return true;
}

/* ---------- build a set ------------------------------------- */
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function buildSet(){
  // gentle ramp for normal cards; 3-letter cards are an explicit child-selected mode
  const words = allWords();
  const threeCardMode = store.mode==="cards" && store.cardLevel===3;
  const customWords = (store.customWords||[]).map(w=>Object.assign({level:1, custom:true}, w));
  const custom = shuffle(threeCardMode ? customWords.filter(w=>w.word.length===3) : customWords);
  const byLvl = {1:shuffle(words.filter(w=>w.level===1)),
                 2:shuffle(words.filter(w=>w.level===2)),
                 3:shuffle(words.filter(w=>w.level===3))};
  const plan = threeCardMode ? [3,3,3,3,3] : [1,1,2,2,2]; // difficulty per question in the set
  const chosenCustom = custom[0] || null;
  const customSlot = chosenCustom ? Math.floor(Math.random()*SET_SIZE) : -1;
  const used = new Set();
  if(chosenCustom) used.add(chosenCustom.id); // reserve it up front so a plan slot can't also pick it (no dup)
  const out = [];
  for(let i=0;i<plan.length;i++){
    if(out.length>=SET_SIZE) break;
    if(chosenCustom && i===customSlot){
      used.add(chosenCustom.id);
      out.push(chosenCustom);
      continue;
    }
    const lvl = plan[i];
    let pool = byLvl[lvl].filter(w=>!used.has(w.id));
    if(pool.length===0){ // fall back to any unused
      pool = shuffle(words.filter(w=>!used.has(w.id) && (!threeCardMode || w.word.length===3)));
    }
    const w = pool[0];
    used.add(w.id);
    out.push(w);
  }
  return out;
}

/* ---------- render quiz ------------------------------------- */
function renderProgress(){
  const p = $("progress"); p.innerHTML="";
  p.setAttribute("aria-label","もんだい "+(qIndex+1)+" / "+SET_SIZE); /* 問題番号 for assistive tech (spec 6.2) */
  for(let i=0;i<SET_SIZE;i++){
    const d=document.createElement("span");
    d.className="pip"+(i<qIndex?" is-done":"")+(i===qIndex?" is-now":"");
    p.appendChild(d);
  }
}
function renderSlots(animateLast){
  const box=$("slots"); box.innerHTML="";
  const n=current.word.length;
  for(let i=0;i<n;i++){
    const s=document.createElement("button");
    s.type="button";
    const filled = i<selected.length;
    s.className="slot"+(filled?" is-filled":"")+(animateLast&&i===selected.length-1?" is-pop":"");
    s.textContent = filled?selected[i]:"";
    s.setAttribute("aria-label", filled?(selected[i]+" を けす"):"あいてる ます");
    if(filled) bindPreview(s, selected[i]);
    if(filled && store.mode==="cards"){ s.addEventListener("click",()=>removeAt(i)); }
    box.appendChild(s);
  }
}
function renderChoices(){
  const box=$("choices"); box.innerHTML="";
  const cols = current.choices.length<=4?2:3;
  box.className="choices cols-"+cols;
  const order = shuffle(current.choices);
  order.forEach(letter=>{
    const b=document.createElement("button");
    b.type="button"; b.className="tile"; b.textContent=letter;
    b.dataset.letter=letter;
    b.setAttribute("aria-label", letter);
    b.addEventListener("pointerdown",()=>startDwell(b, letter));
    bindPreview(b, letter);
    b.addEventListener("click",()=>{ if(!suppressClick) tapLetter(letter); });
    box.appendChild(b);
  });
}
function updateHintGlow(){
  // after a gentle retry, glow the next-needed card
  const next = current.word[selected.length];
  document.querySelectorAll(".tile").forEach(t=>{
    t.classList.toggle("is-hint", wrongCount>=1 && t.dataset.letter===next);
  });
}
function focusNextHint(){
  if(store.mode!=="cards") return;
  const hint = document.querySelector(".tile.is-hint");
  if(hint && typeof hint.focus==="function") hint.focus({preventScroll:true});
}
function recordMiss(kana){
  if(!kana) return;
  store.misses[kana] = (store.misses[kana]||0)+1;
  setMisses.push(kana);
  saveStore();
}

function renderClap(){
  clapCount=0;
  $("mora-dots").innerHTML="";
  [...current.word].forEach(()=>{
    const d=document.createElement("span");
    d.className="mora-dot";
    $("mora-dots").appendChild(d);
  });
}
function updateClap(){
  document.querySelectorAll(".mora-dot").forEach((d,i)=>d.classList.toggle("is-on", i<clapCount));
}
function clapTap(){
  if(locked) return;
  clapCount = Math.min(clapCount + 1, current.word.length);
  blip("tap"); updateClap();
  if(clapCount >= current.word.length){
    locked=true;
    speakWordSlow(current.word);
    scheduleSolve(onCorrect, Math.max(650, current.word.length*520));
  }
}
function renderMirror(){
  const chars=[...current.word];
  mirrorAnswer = chars.find(ch=>MIRROR_KANA.includes(ch)) || chars[0];
  const opts = shuffle([{ok:true, cls:""}, {ok:false, cls:Math.random()>.45?"is-flip":"is-rotate"}]);
  $("mirror-choices").innerHTML="";
  opts.forEach(o=>{
    const b=document.createElement("button");
    b.type="button"; b.className="mirror-choice "+o.cls;
    b.innerHTML="<span>"+mirrorAnswer+"</span>";
    b.setAttribute("aria-label", o.ok ? "ただしい むき" : "ちがう むき");
    b.addEventListener("click",()=>mirrorPick(o.ok));
    $("mirror-choices").appendChild(b);
  });
}
function mirrorPick(ok){
  if(locked) return;
  if(ok){ locked=true; blip("good"); speakKana(mirrorAnswer); scheduleSolve(onCorrect, 520); }
  else{
    wrongCount++; $("message").textContent="こっちかな？"; setPeepMood("think");
    $("mirror-choices").classList.add("is-wrong");
    after(520, ()=>$("mirror-choices").classList.remove("is-wrong"));
  }
}
function renderTeach(){
  const chars=[...current.word];
  teachIndex = Math.min(chars.length-1, Math.floor(Math.random()*chars.length));
  const target = chars[teachIndex];
  const wrongPool = current.choices.filter(ch=>ch!==target && !current.word.includes(ch));
  chars[teachIndex] = wrongPool[0] ||
    current.choices.filter(ch=>ch!==target)[0] ||
    KANA_POOL.find(ch=>ch!==target && !current.word.includes(ch)) ||
    KANA_POOL.find(ch=>ch!==target);
  selected = chars;
  renderSlots(false);
  $("slots").classList.add("is-wrong");
  after(500, ()=>$("slots").classList.remove("is-wrong"));
  $("choices").innerHTML="";
  $("choices").className="choices cols-2";
  shuffle([current.word[teachIndex], selected[teachIndex]]).forEach(letter=>{
    const b=document.createElement("button");
    b.type="button"; b.className="tile"; b.textContent=letter; b.dataset.letter=letter;
    bindPreview(b, letter);
    b.addEventListener("click",()=>teachPick(letter));
    $("choices").appendChild(b);
  });
  $("message").textContent="これで いいかな？";
}
function teachPick(letter){
  if(locked) return;
  if(letter===current.word[teachIndex]){
    selected[teachIndex]=letter;
    renderSlots(true);
    $("message").textContent="ありがとう！";
    locked=true; blip("good"); speakKana(letter);
    scheduleSolve(onCorrect, 620);
  }else{
    wrongCount++; $("message").textContent="よくみてみよう"; setPeepMood("think");
  }
}
function renderEar(){
  const box=$("ear-choices");
  box.innerHTML="";
  box.classList.remove("is-wrong");
  const pool=shuffle(allWords().filter(w=>w.id!==current.id && w.emoji!==current.emoji)).slice(0,2);
  shuffle([current].concat(pool)).forEach(w=>{
    const b=document.createElement("button");
    b.type="button"; b.className="ear-choice"; b.textContent=w.emoji;
    b.setAttribute("aria-label", w.word);
    b.addEventListener("click",()=>earPick(w.id===current.id));
    box.appendChild(b);
  });
}
function earPick(ok){
  if(locked) return;
  if(ok){
    locked=true; blip("good");
    scheduleSolve(onCorrect, 520);
  }else{
    wrongCount++; $("message").textContent="よく きいてみよう"; setPeepMood("think");
    const box=$("ear-choices");
    box.classList.add("is-wrong");
    after(520, ()=>box.classList.remove("is-wrong"));
  }
}

function loadQuestion(){
  clearGameTimers();
  suppressClick=false;
  current = queue[qIndex];
  selected = []; wrongCount=0; locked=false; drawing=false; traceBusy=false;
  store.played++; saveStore();
  $("message").textContent="";
  renderProgress(); renderSlots(false);
  const mode = store.mode;
  const modeDef = modeDefFor(mode);
  screens.quiz.dataset.mode = mode;
  screens.quiz.dataset.length = String(current.word.length);
  MODE_AREA_IDS.forEach(id=>$(id).hidden = !modeDef.areas.includes(id));
  $("slots").hidden = !modeDef.slots;
  $("listen-btn").hidden = !modeDef.listen;
  $("redo-btn").hidden = !modeDef.redo;
  $("prompt-text").textContent = modeDef.prompt;
  if(modeDef.hint === "emoji"){
    $("hint-emoji").textContent = current.emoji;
    $("hint-emoji").setAttribute("aria-label", "ヒントの え");
  }else{
    $("hint-emoji").textContent = modeDef.hint;
    $("hint-emoji").setAttribute("aria-label", modeDef.hintLabel || "ヒント");
  }
  const renderers = {
    choices: renderChoices,
    trace: ()=>setupTraceChar(false),
    clap: renderClap,
    mirror: renderMirror,
    teach: renderTeach,
    ear: renderEar
  };
  (renderers[modeDef.renderer] || renderChoices)();
  show("quiz");
  startPlayClock();
  if(modeDef.speech === "slow-word") speakWordSlow(current.word);
  else if(modeDef.speech === "word") speak(current.word);
  else if(modeDef.speech) speak(modeDef.speech, modeDef.speechRate);
}

/* ---------- handwriting (trace) mode ------------------------ */
function traceFont(){
  return '700 200px "UD Digi Kyokasho NK-R","UD Digi Kyokasho N-R","UD デジタル 教科書体 NK-R","UD デジタル 教科書体 N-R","Yu Kyokasho","YuKyokasho","游教科書体","Hiragino Maru Gothic ProN","M PLUS Rounded 1c",system-ui,sans-serif';
}
function setTraceGlyphStyle(ctx, color){
  ctx.fillStyle=color;
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.font=traceFont();
}
function drawWorksheetGrid(ctx){
  ctx.save();
  ctx.strokeStyle="rgba(255,194,75,.28)";
  ctx.lineWidth=2;
  ctx.setLineDash([8,8]);
  ctx.strokeRect(24,24,PAD-48,PAD-48);
  ctx.beginPath();
  ctx.moveTo(PAD/2,26); ctx.lineTo(PAD/2,PAD-26);
  ctx.moveTo(26,PAD/2); ctx.lineTo(PAD-26,PAD/2);
  ctx.stroke();
  ctx.restore();
}
function drawTraceGuide(ch, color){
  padGuideCtx.clearRect(0,0,PAD,PAD);
  drawWorksheetGrid(padGuideCtx);
  padGuideCtx.save();
  padGuideCtx.globalAlpha=.20;
  setTraceGlyphStyle(padGuideCtx, "#4A3B2E");
  padGuideCtx.fillText(ch, PAD/2, PAD/2+6);
  if(color && color !== "#E8DCC6"){
    padGuideCtx.globalAlpha=.28;
    setTraceGlyphStyle(padGuideCtx, color);
    padGuideCtx.fillText(ch, PAD/2, PAD/2+6);
  }
  padGuideCtx.restore();
}
function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}
function stopTraceDemo(){
  if(traceDemoTimer){ cancelAfter(traceDemoTimer); traceDemoTimer=null; }
  if(traceDemoFrame){ cancelAnimationFrame(traceDemoFrame); traceDemoFrame=null; }
  const dot=$("ghost-dot");
  if(dot){
    dot.classList.remove("is-on");
    dot.style.opacity="";
  }
  if(current && store.mode==="trace" && !traceBusy){
    const ch=current.word[selected.length];
    if(ch) drawTraceGuide(ch, "#E8DCC6");
  }
}
function clearTraceHelp(){
  traceTimers.forEach(cancelAfter);
  traceTimers = [];
  stopTraceDemo();
}
function reinforceTraceGuide(ch){
  drawTraceGuide(ch, "#FFD79A");
}
function stillThisTraceChar(ch){
  return screens.quiz.classList.contains("is-active") &&
    store.mode==="trace" && current && current.word[selected.length]===ch && !traceBusy;
}
function startTraceHelp(ch){
  clearTraceHelp();
  traceTimers = [
    after(TRACE_HINT_MS, ()=>{
      if(!stillThisTraceChar(ch)) return;
      reinforceTraceGuide(ch);
      $("message").textContent = "ここを なぞってね";
      speak("ここを なぞってね", 0.85);
    }),
    after(TRACE_RELAX_MS, ()=>{
      if(!stillThisTraceChar(ch)) return;
      $("message").textContent = "ゆっくり なぞろう";
      speak("ゆっくり なぞろう", 0.85);
    }),
    after(TRACE_AUTO_MS, ()=>{
      if(!stillThisTraceChar(ch)) return;
      traceDoneUnlocked = true;
      updateTraceDoneUi(true);
      $("message").textContent = "できたら おしてね";
      speak("いっしょに かこう", 0.85);
      playTraceDemo(true);
    }),
  ];
}
function updateTraceDoneUi(ready){
  const btn=$("trace-done-btn");
  if(!btn) return;
  btn.disabled = !ready;
  btn.textContent = ready ? "できた" : "なぞってね";
  btn.classList.toggle("is-disabled", !ready);
  btn.setAttribute("aria-disabled", String(!ready));
}
function setupTraceChar(speakIt){
  const ch = current.word[selected.length];
  traceBusy=false; drawing=false;
  totalTraceLen = 0; traceDoneUnlocked = false;
  clearTraceHelp();
  updateTraceDoneUi(false);
  // visible faint guide
  drawTraceGuide(ch, "#E8DCC6");
  // offscreen solid render -> sample the glyph pixels we want covered
  const off=document.createElement("canvas"); off.width=PAD; off.height=PAD;
  const oc=off.getContext("2d",{willReadFrequently:true});
  setTraceGlyphStyle(oc, "#000");
  oc.fillText(ch, PAD/2, PAD/2+6);
  const g=oc.getImageData(0,0,PAD,PAD).data;
  guidePts=[];
  for(let y=0;y<PAD;y+=4){ for(let x=0;x<PAD;x+=4){ if(g[(y*PAD+x)*4+3]>40) guidePts.push([x,y]); } }
  guideArea=guidePts.length;
  // reset ink layer
  padCtx.clearRect(0,0,PAD,PAD);
  padCtx.lineWidth=BRUSH; padCtx.lineCap="round"; padCtx.lineJoin="round";
  padCtx.strokeStyle="#FF7A59";
  $("pad-done").classList.remove("is-on");
  $("message").textContent = "「"+ch+"」を ゆびで かいてね";
  startTraceHelp(ch);
  const reduceMotion = store.calm || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if(!reduceMotion) traceDemoTimer=after(280, ()=>{
    traceDemoTimer=null;
    playTraceDemo(true);
  });
  if(speakIt){
    speakKana(ch);
    after(420, ()=>speak("かいてね", 0.85));
  }
}
function playTraceDemo(silent){
  if(!current) return;
  stopTraceDemo();
  const ch=current.word[selected.length] || current.word[0];
  const dot=$("ghost-dot");
  dot.classList.remove("is-on");
  dot.style.opacity="";
  drawTraceGuide(ch, "#FFD79A");
  if(!silent){
    speakKana(ch);
    after(420, ()=>speak("なぞってね", 0.85));
  }
  const pts = guidePts.length ? guidePts : [[PAD/2,70],[PAD/2,PAD/2],[PAD/2,PAD-70]];
  const count = Math.min(42, pts.length);
  const path = [];
  for(let i=0;i<count;i++){
    const idx = count===1 ? 0 : Math.floor(i*(pts.length-1)/(count-1));
    path.push(pts[idx]);
  }
  const r=$("pad").getBoundingClientRect();
  const sx=r.width/PAD, sy=r.height/PAD;
  const start=performance.now(), duration=1200;
  const move=(now)=>{
    if(!stillThisTraceChar(ch)){ dot.classList.remove("is-on"); return; }
    const t=clamp((now-start)/duration, 0, 1);
    const p=path[Math.min(path.length-1, Math.floor(t*(path.length-1)))];
    dot.style.transform = "translate("+(p[0]*sx-11).toFixed(1)+"px,"+(p[1]*sy-11).toFixed(1)+"px) scale(1)";
    dot.classList.add("is-on");
    if(t<1) traceDemoFrame=requestAnimationFrame(move);
    else{
      traceDemoFrame=null;
      traceDemoTimer=after(180, ()=>{
        traceDemoTimer=null;
        dot.classList.remove("is-on");
        if(stillThisTraceChar(ch)) drawTraceGuide(ch, "#E8DCC6");
      });
    }
  };
  traceDemoFrame=requestAnimationFrame(move);
}
function padPos(e){
  const r=$("pad").getBoundingClientRect();
  return [
    clamp((e.clientX-r.left)*(PAD/r.width), 0, PAD),
    clamp((e.clientY-r.top)*(PAD/r.height), 0, PAD)
  ];
}
function padDown(e){
  if(traceBusy || drawing || e.isPrimary===false) return;
  stopTraceDemo();
  drawing=true; curStrokeLen=0;
  try{ $("pad").setPointerCapture(e.pointerId); }catch(_){}
  const p=padPos(e); lastXY=p;
  padCtx.beginPath(); padCtx.moveTo(p[0],p[1]); padCtx.lineTo(p[0]+0.1,p[1]); padCtx.stroke(); // a dot
  e.preventDefault();
}
function padMove(e){
  if(!drawing || e.isPrimary===false) return;
  const p=padPos(e);
  const step = Math.hypot(p[0]-lastXY[0], p[1]-lastXY[1]);
  curStrokeLen += step;
  padCtx.beginPath(); padCtx.moveTo(lastXY[0],lastXY[1]); padCtx.lineTo(p[0],p[1]); padCtx.stroke();
  lastXY=p;
  e.preventDefault();
}
function commitTraceStroke(){
  if(traceDoneUnlocked){
    updateTraceDoneUi(true);
    $("message").textContent = "できたら おしてね";
    return;
  }
  totalTraceLen += curStrokeLen;
  blip("tap");
  checkTrace();
}
function padUp(e){
  if(!drawing) return;
  drawing=false;
  try{ if(e && e.pointerId!=null) $("pad").releasePointerCapture(e.pointerId); }catch(_){}
  if(curStrokeLen < TRACE_MIN_STROKE_PX){      // stray/brief tap: erase its dot, don't count a stroke
    const r=BRUSH/2+2;
    padCtx.clearRect(lastXY[0]-r, lastXY[1]-r, r*2, r*2);
    return;
  }
  commitTraceStroke();
  curStrokeLen=0;
}
function padCancel(e){            // iOS palm / multi-touch / scroll: end stroke without committing or scoring
  try{ if(e && e.pointerId!=null) $("pad").releasePointerCapture(e.pointerId); }catch(_){}
  drawing=false; curStrokeLen=0;
}
function traceCoverage(){
  if(!guideArea) return 0;
  const data=padCtx.getImageData(0,0,PAD,PAD).data;
  let hit=0;
  for(const [x,y] of guidePts){
    if(data[(y*PAD+x)*4+3]>20) hit++;
  }
  return hit / guideArea;
}
function checkTrace(){
  if(traceBusy || !guideArea) return;
  const ready = totalTraceLen >= 70 && traceCoverage() >= TRACE_MIN_COVERAGE;
  if(ready) traceDoneUnlocked = true;
  updateTraceDoneUi(traceDoneUnlocked);
  if(traceDoneUnlocked){
    $("message").textContent = "できたら おしてね";
  } else {
    $("message").textContent = "うすい じを なぞろう";
  }
}
function acceptTraceChar(){
  clearTraceHelp();
  traceBusy=true;
  totalTraceLen=0;
  curStrokeLen=0;
  traceDoneUnlocked=false;
  updateTraceDoneUi(false);
  const ch=current.word[selected.length];
  const willComplete = selected.length + 1 === current.word.length;
  selected.push(ch);
  blip("good");
  if(!willComplete) speakKana(ch);
  setPeepMood("peek");
  const dn=$("pad-done"); dn.classList.remove("is-on"); void dn.offsetWidth; dn.classList.add("is-on");
  renderSlots(true);
  scheduleSolve(()=>{
    if(selected.length===current.word.length) onCorrect();
    else setupTraceChar(true);
  }, 650);
}

/* ---------- interaction ------------------------------------- */
function tapLetter(letter){
  if(locked) return;
  if(selected.length >= current.word.length) return;
  const next = selected.concat(letter);
  const willBeCorrect = next.length === current.word.length && next.join("") === current.word;
  selected.push(letter);
  blip("tap");
  speakKana(letter);
  setPeepMood("peek");
  renderSlots(true);
  updateHintGlow();
  if(selected.length === current.word.length){
    locked = true;
    scheduleSolve(judge, 760);
  }
}
function removeAt(i){
  if(locked) return;
  selected.splice(i,1);
  blip("tap");
  renderSlots(false);
  updateHintGlow();
}
function judge(){
  if(selected.join("") === current.word){
    onCorrect();
  }else{
    onWrong();
  }
}
function earnsProgressReward(){
  return modeReceivesProgressReward(store.mode);
}
function onWrong(){
  wrongCount++;
  const slots=$("slots");
  slots.classList.add("is-wrong");
  const msg = MSG_WRONG[Math.min(wrongCount-1, MSG_WRONG.length-1)];
  $("message").textContent = msg;
  speak(msg);
  let keep = 0;
  while(keep < selected.length && selected[keep] === current.word[keep]) keep++;
  recordMiss(current.word[keep]);
  setPeepMood("think");
  scheduleSolve(()=>{
    if(!screens.quiz.classList.contains("is-active")) return;
    slots.classList.remove("is-wrong");
    selected = selected.slice(0, keep);
    renderSlots(false);
    updateHintGlow();
    focusNextHint();
    locked = false;
  }, 620);
}
function onCorrect(){
  if(!screens.quiz.classList.contains("is-active")) return;
  if(earnsProgressReward()){
    store.correct++;
    store.todayStamps++; setStamps++;
    if(current && !store.friends.includes(current.id)){
      store.friends.push(current.id);
      store.lastFriend = current.id;
    }
  }
  saveStore();
  blip("good");
  setPeepMood("happy");
  showSuccess();
}

/* ---------- success ----------------------------------------- */
function showSuccess(){
  clearSlowSpeak();
  $("success-emoji").textContent = current.emoji;
  $("success-word-text").textContent = current.word;
  bindPreview($("success-word-text"), current.word);
  $("success-msg").textContent = MSG_RIGHT[Math.floor(Math.random()*MSG_RIGHT.length)];
  const stamp=$("stamp"); stamp.innerHTML = hanaRing(); stamp.classList.remove("is-stamping");
  const scr=$("screen-success"); scr.classList.remove("is-on");
  show("success");
  // retrigger the single hanamaru stamp animation
  void scr.offsetWidth;
  requestAnimationFrame(()=>{
    stamp.classList.add("is-stamping");
    scr.classList.add("is-on");
  });
  after(360, ()=>speak(current.word));
}

function nextQuestion(){
  checkpointPlay();
  qIndex++;
  if(qIndex >= SET_SIZE){ showEnd(); }
  else if(timeUp()){ qIndex--; showRest(); }
  else { loadQuestion(); }
}

/* ---------- end of set -------------------------------------- */
function renderHanaRow(el, count, cap){
  el.innerHTML="";
  const n = Math.min(count, cap);
  for(let i=0;i<n;i++){ const s=document.createElement("span"); s.innerHTML=hanaBadge(); el.appendChild(s.firstChild); }
  if(count>cap){ const m=document.createElement("span"); m.className="tray__more"; m.textContent="＋"+(count-cap); el.appendChild(m); }
}
function showEnd(){
  stopPlayClock();
  recordSetHistory();
  $("end-count").textContent = SET_SIZE+"もん あそんだよ";
  renderHanaRow($("end-hanas"), setStamps, 5);
  show("end");
  after(300, ()=>speak("よく できました"));
}
function recordSetHistory(){
  store.history.push({
    date:todayStr(), played:queue.length || SET_SIZE, correct:setStamps,
    misses:setMisses.slice(-8)
  });
  store.history = store.history.slice(-20);
  saveStore();
}
function showRest(){
  stopSpeaking();
  stopPlayClock();
  clearGameTimers();
  locked=false; drawing=false; traceBusy=false;
  show("rest");
  after(300, ()=>speak("きょうは おしまい。また あした"));
}

/* ---------- home -------------------------------------------- */
function hashPos(id, max){
  let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0;
  return h%max;
}
function renderProfiles(){
  const row=$("profile-row"); row.innerHTML="";
  profiles.items.forEach(p=>{
    const b=document.createElement("button");
    b.type="button"; b.className="profile-btn"+(p.id===activeProfileId?" is-on":"");
    b.textContent=p.emoji; b.setAttribute("aria-label","あそぶ ひと");
    b.addEventListener("click",()=>switchProfile(p.id));
    row.appendChild(b);
  });
}
function switchProfile(id){
  if(id===activeProfileId) return;
  stopSpeaking(); stopPlayClock(); clearGameTimers();
  activeProfileId=id; saveProfiles();
  store=loadStore(); saveStore();
  applyMuteUi(); applyModeUi(); applyLimitUi(); applyPrefs();
  renderHome(); show("home");
}
function renderHill(){
  const hill=$("friend-hill"); hill.innerHTML="";
  const ids=(store.friends||[]).slice(-12);
  const newFriendId = store.lastFriend;
  const perRow = 6;
  const topRows = Math.ceil(ids.length / perRow);
  ids.forEach((id,i)=>{
    const w=wordById(id); if(!w) return;
    const b=document.createElement("button");
    b.type="button"; b.className="friend"+(newFriendId===id?" is-new":"");
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const rowCount = Math.min(perRow, ids.length - row * perRow);
    const x = rowCount===1 ? 45 : 8 + col * (84 / (rowCount - 1));
    const y = topRows===1 ? 33 : (row===0 ? 10 : 55);
    b.textContent=w.emoji; b.style.left=x+"%"; b.style.top=y+"%";
    b.setAttribute("aria-label", w.word);
    b.addEventListener("click",()=>speak(w.word));
    hill.appendChild(b);
  });
  if(newFriendId){
    after(1400, ()=>{
      if(store.lastFriend===newFriendId){ store.lastFriend=""; saveStore(); }
    });
  }
}
function renderHome(){
  renderProfiles();
  renderHill();
  applyHomeModeUi();
  const box=$("home-hanas");
  box.innerHTML="";
  if(store.todayStamps===0){
    const e=document.createElement("span"); e.className="tray__none"; e.textContent="まだ ないよ";
    box.appendChild(e); return;
  }
  renderHanaRow(box, store.todayStamps, 8);
}
function startSet(){
  // a tap unlocks audio context / speech on mobile
  stopSpeaking();
  clearGameTimers();
  navLock=false;
  suppressClick=false;
  primeSpeech();
  if(actx && actx.state==="suspended") actx.resume();
  if(timeUp()){ showRest(); return; }
  queue = buildSet(); qIndex=0; setStamps=0; setMisses=[];
  startPlayClock();
  loadQuestion();
}
function goHome(){
  stopSpeaking();
  stopPlayClock();
  clearGameTimers();
  navLock=false;
  suppressClick=false;
  locked=false; drawing=false; traceBusy=false;
  renderHome(); show("home");
}

/* ---------- sound + parent sheet ---------------------------- */
function applyMuteUi(){
  const mb=$("mute-btn");
  mb.textContent = store.soundOn ? "🔊" : "🔇";
  mb.classList.toggle("is-muted", !store.soundOn);
  mb.setAttribute("aria-pressed", String(!store.soundOn)); /* pressed = muted */
  const tg=$("sound-toggle");
  tg.classList.toggle("is-on", store.soundOn);
  tg.setAttribute("aria-checked", String(store.soundOn));
}
function toggleSound(){
  store.soundOn = !store.soundOn; saveStore(); applyMuteUi();
  if(!store.soundOn) stopSpeaking();
  else primeSpeech();
}
function applyLimitUi(){
  document.querySelectorAll("#limit-seg .mode-opt").forEach(b=>{
    const on = Number(b.dataset.limit) === store.limitMin;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", String(on));
  });
}
function resetPlayTimer(){
  checkpointPlay();
  store.playedMs = 0;
  if(playTick) tickStart = Date.now();
  saveStore();
  $("stat-playtime").textContent = formatPlaytime();
  const btn=$("timer-reset-btn");
  btn.textContent = "リセット済み";
  after(900, ()=>{ btn.textContent = "リセット"; });
}
function applyPrefUi(){
  document.querySelectorAll("#pref-seg .mode-opt").forEach(b=>{
    const on = !!store[b.dataset.pref];
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", String(on));
  });
  applyPrefs();
}
function renderCustomEmojis(){
  const box=$("custom-emojis"); box.innerHTML="";
  CUSTOM_EMOJIS.forEach((e,i)=>{
    const b=document.createElement("button");
    b.type="button"; b.className="custom-emoji"+(i===0?" is-on":""); b.textContent=e; b.dataset.emoji=e;
    b.addEventListener("click",()=>{
      document.querySelectorAll(".custom-emoji").forEach(x=>x.classList.remove("is-on"));
      b.classList.add("is-on");
    });
    box.appendChild(b);
  });
}
function renderCustomList(){
  const box=$("custom-list"); box.innerHTML="";
  (store.customWords||[]).slice(-6).forEach(w=>{
    const s=document.createElement("span");
    s.textContent=w.emoji+" "+w.word;
    box.appendChild(s);
  });
}
function setCustomFeedback(text){
  $("custom-feedback").textContent = text || "";
}
function addCustomWord(){
  const input=$("custom-word");
  const word=(input.value||"").trim();
  const emoji=(document.querySelector(".custom-emoji.is-on")||{}).dataset?.emoji || "⭐";
  if(!validCustomWord(word)){
    setCustomFeedback("かな2〜4文字で入力してください");
    return;
  }
  const sameEmoji = (store.customWords||[]).find(w=>w.emoji===emoji && w.word!==word);
  if(sameEmoji){
    setCustomFeedback(emoji+" は "+sameEmoji.word+" で使っています");
    return;
  }
  const sameWord = (store.customWords||[]).find(w=>w.word===word);
  if(sameWord){
    setCustomFeedback(word+" は もう あります");
    return;
  }
  const id="custom-"+Date.now()+"-"+word;
  store.customWords.push({id, word, emoji, level:1, choices:buildChoices(word)});
  store.customWords=store.customWords.slice(-12);
  input.value="";
  saveStore();
  renderCustomList();
  setCustomFeedback(storageOk ? (word+" を追加しました") : "この端末では ほぞんできません");
}
function updateProfileAddUi(){
  const btn=$("profile-add-btn");
  if(!btn) return;
  const full = profiles.items.length>=3;
  btn.disabled = full;
  btn.setAttribute("aria-disabled", String(full));
}
function addProfile(){
  if(profiles.items.length>=3){ updateProfileAddUi(); return; }
  const id="p"+Date.now();
  const emoji=PROFILE_EMOJIS[profiles.items.length%PROFILE_EMOJIS.length];
  profiles.items.push({id, emoji});
  activeProfileId=id; saveProfiles();
  store=loadStore(); saveStore();
  applyMuteUi(); applyModeUi(); applyLimitUi(); applyPrefUi(); renderHome(); refreshParentStats();
}
function renderTrail(){
  const chart=$("trail-chart");
  const hist=(store.history||[]).slice(-7);
  if(!hist.length){
    chart.innerHTML="";
    $("focus-text").textContent="まだ記録はありません";
    return;
  }
  const pts=hist.map((h,i)=>{
    const x=8+i*(104/Math.max(1,hist.length-1));
    const y=34-(Math.max(0,Math.min(1,h.correct/Math.max(1,h.played)))*26);
    return x.toFixed(1)+","+y.toFixed(1);
  }).join(" ");
  chart.innerHTML='<svg viewBox="0 0 120 42" aria-hidden="true"><polyline points="'+pts+'" fill="none" stroke="#5FB872" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><line x1="6" y1="35" x2="114" y2="35" stroke="#E8DCC6" stroke-width="3"/></svg>';
  const misses=Object.entries(store.misses||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]).join("・");
  $("focus-text").textContent=misses ? "もう少し: "+misses : "今週はよくできています";
}
let parentTrap = null;
let parentReturnFocus = null;
function refreshParentStats(){
  $("stat-played").textContent = store.played;
  $("stat-correct").textContent = store.correct;
  $("stat-playtime").textContent = formatPlaytime();
  renderCustomList();
  renderTrail();
  updateProfileAddUi();
}
function openParents(){
  if(parentTrap){ document.removeEventListener("keydown", parentTrap, true); parentTrap = null; }
  checkpointPlay();
  applyMuteUi();
  applyLimitUi();
  applyModeUi();
  applyPrefUi();
  refreshParentStats();
  parentReturnFocus = (document.activeElement instanceof HTMLElement) ? document.activeElement : $("parent-link");
  $("parent-veil").classList.add("is-open");
  $("parent-veil").setAttribute("aria-hidden","false");
  $("app").inert = true;
  $("app").setAttribute("aria-hidden","true");
  document.body.classList.add("modal-open");
  const sheet = $("parent-sheet");
  sheet.scrollTop = 0;
  requestAnimationFrame(()=>{
    sheet.scrollTop = 0;
    try{ $("parent-title").focus({preventScroll:true}); }
    catch(e){ $("parent-title").focus(); }
  });
  parentTrap = (e)=>{
    if(e.key !== "Tab") return;
    const nodes = $("parent-veil").querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const list = Array.prototype.filter.call(nodes, el => !el.disabled && el.offsetParent !== null);
    if(!list.length){ e.preventDefault(); return; }
    const first = list[0], last = list[list.length-1];
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault(); last.focus();
    }else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault(); first.focus();
    }
  };
  document.addEventListener("keydown", parentTrap, true);
}
function closeParents(){
  const wasOpen = $("parent-veil").classList.contains("is-open");
  $("parent-veil").classList.remove("is-open");
  $("parent-veil").setAttribute("aria-hidden","true");
  $("app").inert = false;
  $("app").removeAttribute("aria-hidden");
  document.body.classList.remove("modal-open");
  if(parentTrap){ document.removeEventListener("keydown", parentTrap, true); parentTrap = null; }
  const target = parentReturnFocus || $("parent-link");
  parentReturnFocus = null;
  if(wasOpen && target && typeof target.focus === "function") target.focus();
}

/* ---------- wire up ----------------------------------------- */
$("start-btn").addEventListener("click", startSet);
$("listen-btn").addEventListener("click", ()=>speak(current.word));
$("quit-btn").addEventListener("click", goHome);
$("mute-btn").addEventListener("click", toggleSound);
$("redo-btn").addEventListener("click", ()=>{
  if(locked || store.mode!=="cards") return;
  selected=[]; renderSlots(false); updateHintGlow(); $("message").textContent="";
});
$("next-btn").addEventListener("click", ()=>{
  if(navLock) return;
  navLock = true;
  nextQuestion();
  setTimeout(()=>{ navLock = false; }, 400);
});
$("again-btn").addEventListener("click", startSet);
$("gohome-btn").addEventListener("click", goHome);
$("rest-home-btn").addEventListener("click", goHome);
$("parent-link").addEventListener("click", openParents);
$("clap-btn").addEventListener("click", clapTap);
$("clap-reset").addEventListener("click", ()=>{
  if(locked) return;
  clapCount=0; updateClap(); $("message").textContent="";
});
$("ear-btn").addEventListener("click", ()=>speakWordSlow(current.word));
$("ear-repeat-btn").addEventListener("click", ()=>speakWordSlow(current.word));
$("demo-btn").addEventListener("click", ()=>playTraceDemo(false));
$("trace-done-btn").addEventListener("click", ()=>{
  if(traceBusy) return;
  if($("trace-done-btn").getAttribute("aria-disabled")==="true"){
    const ch = current && current.word[selected.length];
    if(ch) reinforceTraceGuide(ch);
    $("message").textContent = "もうすこし なぞってね";
    speak("なぞってね", 0.85);
    return;
  }
  acceptTraceChar();
});
$("sound-toggle").addEventListener("click", toggleSound);
$("sheet-close").addEventListener("click", closeParents);
$("sheet-close-top").addEventListener("click", closeParents);
$("parent-veil").addEventListener("click",(e)=>{ if(e.target===$("parent-veil")) closeParents(); });
document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeParents(); });

/* play-mode selector */
function currentHomeModeKey(){
  return homeModeKeyFor(store.mode, store.cardLevel);
}
function enabledHomeModeKeys(){
  store.homeModes = normalizeHomeModes(store.homeModes);
  return store.homeModes;
}
function ensureCurrentHomeModeVisible(){
  const enabled = enabledHomeModeKeys();
  if(enabled.includes(currentHomeModeKey())) return;
  const opt = HOME_MODE_OPTIONS[enabled[0]] || HOME_MODE_OPTIONS.cards;
  store.mode = opt.mode;
  store.cardLevel = opt.cardLevel || 0;
  saveStore();
}
function applyHomeModeUi(){
  ensureCurrentHomeModeVisible();
  const key = currentHomeModeKey();
  const enabled = enabledHomeModeKeys();
  document.querySelectorAll("#home-modes .home-mode").forEach(b=>{
    const visible = enabled.includes(b.dataset.homeMode);
    const on = b.dataset.homeMode===key;
    b.hidden = !visible;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", String(on));
  });
  applyHomeToggleUi();
}
function applyHomeToggleUi(){
  const enabled = enabledHomeModeKeys();
  document.querySelectorAll("#home-toggle-seg .mode-opt").forEach(b=>{
    const on = enabled.includes(b.dataset.homeToggle);
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", String(on));
  });
}
function applyModeUi(){
  document.querySelectorAll("#mode-seg .mode-opt").forEach(b=>{
    const cardLevel = Number(b.dataset.cardLevel || 0);
    const on=b.dataset.mode===store.mode && (b.dataset.mode!=="cards" || cardLevel===store.cardLevel);
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", String(on));
  });
  applyHomeModeUi();
}
function chooseHomeMode(key){
  const opt = HOME_MODE_OPTIONS[key];
  if(!opt) return;
  store.homeModes = normalizeHomeModes(store.homeModes);
  if(!store.homeModes.includes(key)){
    store.homeModes = HOME_MODE_KEYS.filter(k=>k===key || store.homeModes.includes(k));
  }
  store.mode = opt.mode;
  store.cardLevel = opt.cardLevel || 0;
  saveStore();
  applyModeUi();
  blip("tap");
}
function toggleHomeMode(key){
  if(!HOME_MODE_OPTIONS[key]) return;
  let enabled = normalizeHomeModes(store.homeModes);
  if(enabled.includes(key)){
    if(enabled.length===1) return;
    enabled = enabled.filter(k=>k!==key);
  }else{
    const set = new Set(enabled.concat(key));
    enabled = HOME_MODE_KEYS.filter(k=>set.has(k));
  }
  store.homeModes = enabled;
  ensureCurrentHomeModeVisible();
  saveStore();
  applyModeUi();
}
document.querySelectorAll("#home-modes .home-mode").forEach(b=>{
  b.addEventListener("click",()=>chooseHomeMode(b.dataset.homeMode));
});
document.querySelectorAll("#home-toggle-seg .mode-opt").forEach(b=>{
  b.addEventListener("click",()=>toggleHomeMode(b.dataset.homeToggle));
});
document.querySelectorAll("#mode-seg .mode-opt").forEach(b=>{
  b.addEventListener("click",()=>{
    store.mode=b.dataset.mode;
    store.cardLevel=Number(b.dataset.cardLevel || 0);
    if(store.mode!=="cards") store.cardLevel=0;
    const key = currentHomeModeKey();
    store.homeModes = normalizeHomeModes(store.homeModes);
    if(!store.homeModes.includes(key)){
      store.homeModes = HOME_MODE_KEYS.filter(k=>k===key || store.homeModes.includes(k));
    }
    saveStore();
    applyModeUi();
  });
});
document.querySelectorAll("#limit-seg .mode-opt").forEach(b=>{
  b.addEventListener("click",()=>{
    store.limitMin = Number(b.dataset.limit);
    saveStore();
    applyLimitUi();
    $("stat-playtime").textContent = formatPlaytime();
  });
});
document.querySelectorAll("#pref-seg .mode-opt").forEach(b=>{
  b.addEventListener("click",()=>{
    const key=b.dataset.pref;
    store[key] = !store[key];
    saveStore();
    applyPrefUi();
  });
});
$("custom-add-btn").addEventListener("click", addCustomWord);
$("profile-add-btn").addEventListener("click", addProfile);
$("timer-reset-btn").addEventListener("click", resetPlayTimer);
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden) stopPlayClock();
  else if(playScreenActive()) startPlayClock();
});

/* handwriting canvas */
function initPad(){
  padCtx=$("pad").getContext("2d",{willReadFrequently:true});
  padGuideCtx=$("pad-guide").getContext("2d");
  const pad=$("pad");
  pad.addEventListener("pointerdown", padDown);
  pad.addEventListener("pointermove", padMove);
  pad.addEventListener("pointerup", padUp);
  pad.addEventListener("pointercancel", padCancel);
}
$("clear-btn").addEventListener("click",()=>{
  if(traceBusy) return;
  stopTraceDemo();
  padCtx.clearRect(0,0,PAD,PAD);
  drawing=false; curStrokeLen=0;
  totalTraceLen=0; traceDoneUnlocked=false;
  updateTraceDoneUi(false);
  $("message").textContent = "もういちど なぞってね";
});

/* ---------- go ---------------------------------------------- */
registerServiceWorker();
loadRecordedAudioManifest();
initPad();
renderCustomEmojis();
applyMuteUi();
applyModeUi();
applyLimitUi();
applyPrefUi();
renderHome();
show("home");
