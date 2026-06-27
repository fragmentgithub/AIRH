# 修正・拡張 引き継ぎ書（Codex 向け）

対象ファイル: **`index.html`（プロジェクト唯一の実体）**
作成: 2026-06-24 / レビュー: Claude Code（6観点の自動レビュー＋敵対的検証で各指摘を裏取り済み）

> この文書だけで作業できるよう、現状コード・問題・修正方針（コード付き）・受け入れ条件を各項目に自己完結で記載。会話の前提知識は不要です。行番号は現行 `index.html` 基準（編集で多少ずれるのでコード片で照合してください）。

---

## 0. 大前提（絶対に崩さない制約）

- アプリは **1枚の自己完結 `index.html`** のまま。ビルド手順・バンドラ・npm・フレームワーク・追加の外部 JS/CSS は不可（既存の Google Fonts `<link>` のみ例外）。`<style>`/`<script>` はインライン。
- 静的ホスティング（GitHub Pages）/ オフライン / `file://` で動く。バックエンド・ログイン・課金・広告・オンラインランキングなし。
- 主ユーザーは **まだ字が読めない4歳児**。副ユーザーは保護者。UI は日本語。
- 現段階の設計方針: 濁点・半濁点・小書き（ゃゅょっ）は使わない。単語は2〜3文字。
- 公開先: https://fragmentgithub.github.io/AIRH/ （main push で更新）

**総評（自動レビュー）**: 単一ファイルの幼児向けアプリとして完成度は高い。設計トークン・手描き花丸 SVG・`prefers-reduced-motion` 対応・`try/catch` 付き localStorage・大きなタップ領域・赤バツを出さない優しい誤答演出など、狙いをよく実現している。弱点はクラッシュ系ではなく **学習設計とプラットフォーム耐性**：①誤答で正解済みの文字まで全消し＆どこが違うか示さない、②てがき判定が実質ザル（全塗りで合格）、③てがきにヒント/救済が無く非識字児が詰む、④文字単位の「間違えたかな」シグナルを取れているのに捨てている、⑤iOS の音声レース・ズーム禁止などの小さな綻び。

優先度: **P0=体験を壊す / P1=高（学習価値・明確な詰み）/ P2=中 / P3=低・任意。**

## 1. 修正一覧（サマリ）

| ID | 優先 | 内容 | 規模 |
|----|------|------|------|
| P0-1 | 体験崩壊 | クイズ中に「ホーム/やめる」導線が無い（5問完走するまで抜けられない） | 小 |
| P1-1 | 高 | 誤答で**正解済みの文字まで全消し**＋どこが違うか示さない | 小〜中 |
| P1-2 | 高 | てがきに**ヒント/エスカレーション/スキップ無し**で非識字児が詰む | 中 |
| P1-2b | 高 | 【実装後・要追修正】試行カウントがストローク数依存→5回つつきで自動合格／途中で急かす | 小 |
| P1-3 | 高 | てがき判定が**全塗りで必ず合格**（`OVERFLOW_MAX=6` がザル） | 小 |
| P2-1 | 中 | `cancel()+speak()` レースで読み上げが落ちる／iOS で自動読み上げが鳴らない | 小 |
| P2-2 | 中 | ヒントグローが**2回完全誤答後**＆**先頭文字**を光らせる（詰まっている文字でない） | 小 |
| P2-3 | 中 | `maximum-scale=1` でピンチズーム禁止（WCAG 1.4.4）＋ `touch-action` | 極小 |
| P2-4 | 中 | テキストボタン（やりなおし/けす/おうちのかた）のタップ領域が小さい | 極小 |
| P2-5 | 中 | 保護者モーダルのフォーカス管理が無い（キーボード不可・WCAG 2.4.3） | 小 |
| P2-6 | 中 | 絵文字の端末差（VS16）＋ `さる` の `る/ろ` 同居 | 極小 |
| P3-1 | 低 | 保護者シートの「あそんだ」「せいかい」が常に同値（保護者向け表示のみ） | 小 |
| P3-2 | 低 | 「全画面アプリ」を謳う割に standalone メタ無し | 小 |
| F-1 | 機能追加 | タイマー（あそぶ じかん）= 保護者プレイ時間制限 | 中 |

---

## 2. 修正の詳細

### P0-1. クイズ中に「ホーム/やめる」導線が無い

- **場所**: クイズ topbar（約 410–413 行）, `show()`（約 599 行）。
- **現状**:
  ```html
  <div class="topbar">
    <div class="progress" id="progress" role="img" aria-label="もんだい"></div>
    <button class="icon-btn" id="mute-btn" aria-label="おとの オン・オフ" aria-pressed="false">🔊</button>
  </div>
  ```
  `おうちへ`（`gohome-btn`）は**おしまい画面のみ**。`success` は `つぎへ` のみ。
- **問題**: `はじめる` を押したら **5問やりきるまで離脱不能**。README は「ホーム画面に追加して全画面アプリ」を謳うが、PWA standalone では端末の戻るも無く、manifest/history も無いため、途中でやめたい子・保護者は**アプリ強制終了するしかない**。仕様の狙い（§2「親が遊びすぎを避けやすい」/ §12「区切りを明確に」/ §2「失敗しても嫌にならない」）と矛盾。
- **修正**: topbar 左に小さなホームボタン。`justify-content:space-between` なので「🏠 ─ 進捗 ─ 🔊」で自然に収まる。
  ```html
  <div class="topbar">
    <button class="icon-btn" id="quit-btn" aria-label="おうちへ もどる">🏠</button>
    <div class="progress" id="progress" role="img" aria-label="もんだい"></div>
    <button class="icon-btn" id="mute-btn" aria-label="おとの オン・オフ" aria-pressed="false">🔊</button>
  </div>
  ```
  ```js
  $("quit-btn").addEventListener("click", ()=>{
    if("speechSynthesis" in window) speechSynthesis.cancel();
    locked = false;
    stopPlayClock();      // F-1 を入れる場合
    renderHome(); show("home");
  });
  ```
- **判断**: 確認ダイアログは文章が読めない幼児に逆効果。**ボタンを小さめ＆角**に置く方が良い。離脱コストは低い（いつでも再開可）。正解済みの `todayStamps`/`correct` は保存済みで失われない。
- **受け入れ条件**: どの問題からでも 🏠 でホームに戻れる／戻った後 `はじめる` で正常再開／今日のはなまる保持／読み上げ中なら停止。

### P1-1. 誤答で正解済みの文字まで全消し＆どこが違うか示さない

- **場所**: `tapLetter()`（851–862）, `judge()`（870–876）, `onWrong()`（877–890, `selected=[]` は 885）, `updateHintGlow()`（752–758）。
- **現状/仕様整合**: 仕様 §7 は「間違った文字も枠に入る／完成時に違えば『もういっかい』とやさしく戻す」を**明示的に要求**しており、現行の「埋めてから判定」は仕様準拠。問題は `onWrong()` が `selected=[]` で**正解済みの文字も含めて全消し**する点。せっかく合っていた文字まで消え、しかも**どこが違ったか分からない**ため、学習効果が薄く、達成感もそがれる。
- **修正（推奨・仕様維持の最小変更）**: 全消しをやめ、**正しい先頭プレフィックスを残し、最初に違う位置から戻す**。
  ```js
  function onWrong(){
    wrongCount++;
    const slots=$("slots");
    slots.classList.add("is-wrong");
    const msg = MSG_WRONG[Math.min(wrongCount-1, MSG_WRONG.length-1)];
    $("message").textContent = msg; speak(msg);
    // 合っている先頭ぶんは残す
    let k=0; while(k<selected.length && selected[k]===current.word[k]) k++;
    setTimeout(()=>{
      slots.classList.remove("is-wrong");
      selected = selected.slice(0, k);
      renderSlots(false); updateHintGlow(); locked=false;
    }, 620);
  }
  ```
  これで `updateHintGlow()` 内の `current.word[selected.length]` が**実際に詰まっている文字**を指すようになり、P2-2 も自動的に改善する。
- **修正（より教育的・要承認の設計変更）**: `tapLetter()` で **1タップずつ正誤判定**し、誤タップは置かずに当該枠を wobble、`recordMiss()`（→「今後の拡張案」の苦手かな記録）で位置/順序を能動的に教える。ただし §7 の「枠に入れてから判定」から逸脱するので**採用は要承認**。
  ```js
  function tapLetter(letter){
    if(locked || selected.length>=current.word.length) return;
    const expected = current.word[selected.length];
    if(letter===expected){
      selected.push(letter); blip("tap"); speak(letter,0.8);
      renderSlots(true); updateHintGlow();
      if(selected.length===current.word.length){ locked=true; setTimeout(onCorrect,480); }
    }else{
      wrongCount++; /* recordMiss(expected, letter); */
      const slots=$("slots"); slots.classList.add("is-wrong");
      const msg=MSG_WRONG[Math.min(wrongCount-1,MSG_WRONG.length-1)];
      $("message").textContent=msg; speak(msg);
      setTimeout(()=>{ slots.classList.remove("is-wrong"); $("message").textContent=""; },620);
      updateHintGlow();
    }
  }
  ```
- **受け入れ条件**: 誤答後も合っていた文字は枠に残る（最小案）/ 誤タップで強い失敗演出を出さない（赤バツ禁止・§8）/ ヒントグローが詰まっている文字を指す。

### P1-2. てがきモードにヒント/救済が無く、非識字児が詰む

- **場所**: `setupTraceChar()`（778–803）, `checkTrace()`（828–836）, trace markup（431–439）。`updateHintGlow()` は**ふだモード専用**で、てがきには一切の救済が無い。
- **問題**: 難しいかな（`さる` の `る`(531) / `かえる`(543) 等）で、4歳児が何度なぞっても閾値に届かないと**永遠に進めない**。やめる導線も無い（→P0-1）ので完全に詰む。
- **修正**: 試行回数/経過で段階的に救済。新規依存なしで既存キャンバスのみ。
  ```js
  let traceAttempts = 0, traceHelpTimer = null;
  // setupTraceChar() の末尾でリセット & タイマー開始
  traceAttempts = 0;
  clearTimeout(traceHelpTimer);
  traceHelpTimer = setTimeout(()=>{           // 10秒詰まったらガイドを強調
    padGuideCtx.fillStyle = "#FFD79A";        // 通常#E8DCC6より濃く
    padGuideCtx.fillText(ch, PAD/2, PAD/2+6);
  }, 10000);
  ```
  ```js
  // checkTrace() が不合格だったとき（padUp で acceptしなかった経路）に試行カウント
  // けす(clear-btn) と「描いたが届かない」で traceAttempts++ し、段階緩和：
  //   3回 → COVER_OK を一時的に 0.35 に下げる
  //   5回 → 自動合格（「いっしょに かこう」と読み上げて acceptTraceChar()）
  ```
  併せて任意で **「みほん」ボタン**（ガイド字をなぞる軌跡を一瞬アニメ表示）を付けると親切。閾値（10秒/3回/5回）は実機で要調整。`setupTraceChar`/`acceptTraceChar` で `clearTimeout(traceHelpTimer)` を忘れずに。
- **受け入れ条件**: 同じ字で詰まり続けても必ず前進できる（自動合格 or 緩和）/ 簡単な字では救済が出る前に普通に合格する/ 演出（✓ ポップ・読み上げ・次画遷移）は維持。

### P1-2b. 【実装後・要追修正】試行カウントを「ストローク数」で数えない

> 状況: 上記 P1-2/P1-3 はコミット `c023a76`「Implement handoff now fixes」で実装済み。実機検証で下記の不具合が判明したので追修正する。**この節は as-implemented のコードが前提。**

- **場所（現行コード）**: `checkTrace()`, `noteTraceAttempt()`, `startTraceHelp()`/`clearTraceHelp()`, `setupTraceChar()`, `clear-btn` ハンドラ、定数 `TRACE_*`。
- **問題（検証済み・実測）**: `checkTrace()` は `padUp`（＝1ストローク終わり）ごとに呼ばれ、未達だと `noteTraceAttempt()` が `traceAttempts++` する。つまり**ストローク数＝試行回数**になっている。実機で「なぞらず小さな点を5回つついた」だけで自動合格した:
  ```
  dot1: もうすこし なぞってね
  dot2: もうすこし なぞってね
  dot3: ゆっくり なぞろう      ← 3回で COVER_OK 緩和
  dot5: いっしょに かこう      ← 5回で acceptTraceChar() 自動合格（slots に「も」が入る）
  ```
  弊害は2つ:
  1. **P1-3 の穴が一部再発** — 形をなぞらず5回つつくだけで通る。
  2. **複数画のかな（ま・は・ね 等）で誤作動** — 1文字を書くのにペンを3〜4回離すので、(a) 書いてる**途中で「もうすこし」と急かし**、(b) 5回離した時点で雑でも自動合格。
  ※ 原因は元引き継ぎ書の「描いたが届かない＝1回」という表現が曖昧だったため。実装は忠実。
- **修正方針: カウントを「ペン離し」から外し、時間ベース＋「けす」押下に変える。**
  - `checkTrace()` の失敗時は **加算も発話もしない**（合否判定のみ）:
    ```js
    function checkTrace(){
      if(traceBusy || !guideArea) return;
      /* …coverage / overflow / precision を計算… */
      if(traceMatches(coverage, overflow, precision)) acceptTraceChar();
      // 失敗時は何もしない（ストロークごとに急かさない／数えない）
    }
    ```
  - `setupTraceChar()` で**文字ごとに**段階タイマーを張る（ストロークではリセットしない）。`clearTraceHelp()` は全タイマーを消すよう配列対応に:
    ```js
    let traceTimers = [];
    function clearTraceHelp(){ traceTimers.forEach(clearTimeout); traceTimers = []; }
    const stillThisChar = (ch)=> screens.quiz.classList.contains("is-active")
      && store.mode==="trace" && current && current.word[selected.length]===ch && !traceBusy;
    // setupTraceChar() 末尾（traceAttempts=0; の後）:
    clearTraceHelp();
    traceTimers = [
      setTimeout(()=>{ if(stillThisChar(ch)){ reinforceTraceGuide(ch); $("message").textContent="ここを なぞってね"; speak("ここを なぞってね",0.85); } }, 8000),
      setTimeout(()=>{ if(stillThisChar(ch)){ traceAttempts=TRACE_RELAX_ATTEMPTS; $("message").textContent="ゆっくり なぞろう"; speak("ゆっくり なぞろう",0.85); } }, 16000),
      setTimeout(()=>{ if(stillThisChar(ch)){ $("message").textContent="いっしょに かこう"; speak("いっしょに かこう",0.85); acceptTraceChar(); } }, 24000),
    ];
    ```
    （16秒の `traceAttempts=TRACE_RELAX_ATTEMPTS` は既存 `traceMatches()` の COVER_OK 緩和をそのまま発火させる用。次の `padUp` で甘めに判定される。）
  - **「けす」(clear-btn) は give-up シグナル**として1段階進める（やり直すほど救済が近づく）:
    ```js
    $("clear-btn").addEventListener("click",()=>{
      if(traceBusy) return;
      padCtx.clearRect(0,0,PAD,PAD);
      traceAttempts++;
      if(traceAttempts>=TRACE_AUTO_ATTEMPTS){ acceptTraceChar(); }
      else if(traceAttempts>=TRACE_RELAX_ATTEMPTS){ $("message").textContent="ゆっくり なぞろう"; }
    });
    ```
  - これにより `noteTraceAttempt()` は実質「けす」経由のみになる（per-`padUp` 呼び出しを削除）。`acceptTraceChar()`/`goHome()` 等で `clearTraceHelp()` を呼ぶのは現行どおり維持。タイミング（8/16/24秒）と `TRACE_RELAX/AUTO_ATTEMPTS` は実機で要調整。
- **受け入れ条件**:
  1. 形をちゃんとなぞれば（多少はみ出ても）通る。
  2. **何もせず／小さな点を5回つついても合格しない**（時間が経つまで合格しない）。
  3. 複数画のかなを**書いている途中で急かさない**（メッセージは8秒まで「『○』を ゆびで かいてね」のまま）。
  4. 本当に詰まっても、約24秒 or 「けす」連打で必ず救済（自動合格）され、絶対に詰まない。

### P1-3. てがき判定が全塗りで必ず合格（`OVERFLOW_MAX` がザル）

- **場所**: `checkTrace()`（828–836）, 定数 `COVER_OK=0.5`/`OVERFLOW_MAX=6`（585–586）, `setupTraceChar()`（778–803）。
- **問題（検証済み）**: グリッドは 4px 間隔で `75×75=5625` セル。グリフは ~1125–2250 セルなので、枠を全塗りすると `coverage≈1.0`（≥0.5 通過）かつ `overflow=5625/guideArea≈2.5〜5.0`（常に ≤6 通過）。**`OVERFLOW_MAX=6` は何も弾けず、ぐちゃ塗りで全問合格**＝なぞり学習が成立しない。
- **修正A（最小・推奨の即効）**: `OVERFLOW_MAX` を **~2.0** に下げる。`COVER_OK=0.5` は甘めのまま維持（本物の雑ななぞりは通す）。最小画数のかなで「全塗りが弾かれ、普通のなぞりは通る」ことを実機確認。
  ```js
  const OVERFLOW_MAX = 2.0;   // was 6（要・実機検証）
  ```
- **修正B（堅牢・任意）**: ガイドを許容幅ぶん太らせたマスクを作り、子のインクのうちマスク内に乗った割合 `precision` を併用（全塗りは precision が落ちる）。
  ```js
  let guideMask = null; const PRECISION_OK = 0.6;
  // setupTraceChar(): guidePts 構築直後に膨張マスク
  const GW=PAD/4, TOL=5;        // 5セル≈20px の許容
  guideMask=new Uint8Array(GW*GW);
  for(const [gx,gy] of guidePts){ const cx=gx/4|0, cy=gy/4|0;
    for(let dy=-TOL;dy<=TOL;dy++)for(let dx=-TOL;dx<=TOL;dx++){
      const nx=cx+dx, ny=cy+dy; if(nx>=0&&nx<GW&&ny>=0&&ny<GW) guideMask[ny*GW+nx]=1; } }
  ```
  ```js
  // checkTrace():
  let covered=0, ink=0, inside=0;
  for(let y=0;y<PAD;y+=4)for(let x=0;x<PAD;x+=4){
    if(d[(y*PAD+x)*4+3]>40){ ink++; if(guideMask[(y/4)*GW+(x/4)]) inside++; } }
  for(let i=0;i<guidePts.length;i++){ const x=guidePts[i][0],y=guidePts[i][1]; if(d[(y*PAD+x)*4+3]>40) covered++; }
  const coverage=covered/guideArea, precision=ink?inside/ink:0;
  if(coverage>=COVER_OK && precision>=PRECISION_OK) acceptTraceChar();
  ```
- **注意**: P1-2 の自動救済と必ず併用（厳しくする以上、詰み防止が前提）。閾値は要遊びテスト。
- **受け入れ条件**: 枠全塗りでは合格しない / 大体なぞれば（多少はみ出ても）合格 / P1-2 の救済で詰まない。

### P2-1. `cancel()+speak()` レースで読み上げが落ちる／iOS で自動読み上げが鳴らない

- **場所**: `speak()`（657–670, `cancel()`@661 直後に `speak()`@668）, 出題時の自動読み上げ `setTimeout`（773）。
- **問題（検証済み）**: iOS Safari で `cancel()` 直後の `speak()` が無視される既知レース。さらに iOS はユーザー操作起点でないと発話を許さないため、タイマー経由の自動読み上げ（773）が鳴らないことがある。
- **修正**:
  ```js
  function speak(text, rate){
    if(!store.soundOn || !("speechSynthesis" in window)) return;
    try{
      if(speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(text);
      u.lang="ja-JP"; if(jaVoice)u.voice=jaVoice; u.rate=rate||0.95; u.pitch=1.0; u.volume=0.9;
      requestAnimationFrame(()=>{ try{ speechSynthesis.speak(u); }catch(e){} }); // 1tick ずらす
    }catch(e){}
  }
  ```
  初回タップ（`startSet`）で無音発話プライミング:
  ```js
  let speechPrimed=false;
  function primeSpeech(){
    if(speechPrimed || !("speechSynthesis" in window)) return; speechPrimed=true;
    try{ const u=new SpeechSynthesisUtterance(" "); u.volume=0; speechSynthesis.speak(u); }catch(e){}
  }
  // startSet() 先頭で primeSpeech();
  ```
  `もういちど きく` ボタンは確実な経路として維持。
- **受け入れ条件**: 出題時の自動読み上げが iOS でも鳴る（初回タップ後）/ 連続操作で読み上げが落ちにくい。

### P2-2. ヒントグローのタイミングと対象

- **場所**: `updateHintGlow()`（752–758, `wrongCount>=2`）, `onWrong()`（887 で呼ぶが直前に `selected=[]`）。
- **問題（検証済み）**: グローは「**2回完全に誤答**」しないと出ず、しかも `onWrong` が `selected` を空にした後に呼ぶため `current.word[selected.length]` が `word[0]`（先頭）を指す＝**詰まっている文字でなく常に1文字目**が光る。仕様 §7「2回続けて迷ったら光らせる」より遅く、的外れ。
- **修正**: P1-1（プレフィックス保持 or 1文字判定）を入れれば `selected.length` が実位置を表すので**対象は自動で正しくなる**。タイミングは「迷い（誤タップ/時間）」基準に前倒し（1文字判定なら `wrongCount>=1〜2` の誤タップで発火）。`updateHintGlow` のロジック自体は流用可。
- **受け入れ条件**: 迷い始めて早めに、**次に必要な文字**が光る。

### P2-3. `maximum-scale=1` でピンチズーム禁止（WCAG 1.4.4）

- **場所**: 5 行目 viewport meta。
- **修正**: `maximum-scale=1` を削除（`user-scalable=no` も付けない）。レイアウトは `clamp()` 流動で安全、`#pad` は `touch-action:none` 済み。
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  ```
  二度押しズームが気になるなら、グローバル禁止でなく `.tile/.btn/.icon-btn` に `touch-action:manipulation;` を付与（`もも` の連続タップも軽快に）。
- **受け入れ条件**: 低視力の保護者が 13px の注記等をピンチ拡大できる / てがき描画はズームに干渉されない。

### P2-4. テキストボタンのタップ領域が小さい

- **場所**: `.ghost-btn`（113–119）= `やりなおし`/`けす`/`おうちのかた`。
- **問題**: テキストのみで実寸 ~18–22px。4歳児の指には小さい（§7「押しやすく」）。
- **修正**: 最低タップ寸法を確保。
  ```css
  .ghost-btn{ min-height:44px; padding:.4em .9em; display:inline-flex; align-items:center; justify-content:center; }
  ```
- **受け入れ条件**: 主要テキストボタンが 44px 以上の高さ。

### P2-5. 保護者モーダルのフォーカス管理が無い（WCAG 2.4.3 / 4.1.2）

- **場所**: `openParents()`/`closeParents()`（968–978）, markup（473–491）, `show()`（599）。
- **修正（最も簡単・推奨）**: シートを**ネイティブ `<dialog>`** にして `showModal()/close()` を使う。フォーカストラップ・Escape・フォーカス復帰が無料で付く（単一ファイルのまま）。
- **修正（現マークアップ維持なら）**:
  ```js
  let lastFocus=null;
  function openParents(){ lastFocus=document.activeElement; /*…*/
    $("parent-veil").classList.add("is-open"); $("parent-veil").setAttribute("aria-hidden","false");
    $("sheet-close").focus(); }
  function closeParents(){ $("parent-veil").classList.remove("is-open");
    $("parent-veil").setAttribute("aria-hidden","true"); if(lastFocus&&lastFocus.focus) lastFocus.focus(); }
  ```
  併せて Tab を先頭/末尾でラップ。`show()` でも新画面に `tabindex=-1`＋`focus()` を当てると尚良い。
- **受け入れ条件**: Tab だけで保護者シートを開閉でき、閉じると `おうちのかた` にフォーカスが戻る / Escape で閉じる。

### P2-6. 絵文字の端末差（VS16）＋ `さる` の `る/ろ` 同居

- **場所**: `WORDS`（505–549）。
- **修正（データ）**:
  - `かさ`(519) `☂️`→`☔` / `やま`(520) `⛰️`→`🗻` / `とけい`(546) `🕐`→`⏰`：異体字セレクタ付き絵文字は旧 Android/Windows でモノクロ・豆腐落ちする。単一コードポイント絵文字に置換すると全端末でカラー表示＆幼児に伝わりやすい。
  - `さる`(531) `choices:["さ","る","ろ","に"]`：レベル2の設計コメントは「形の似た字は1組まで」だが `る` の隣に最類似の `ろ` を直置き。`ろ` を `に` や `ま` 等に差し替え、最年少には最難の弁別を外す。
  - 任意: `👂`(みみ)・`⛵`(ふね) は伝わりにくければ別語/別絵文字を検討（バグではない）。
- **受け入れ条件**: 対象絵文字が主要端末でカラー表示 / `さる` の選択肢に `る`/`ろ` が同居しない。

### P3-1. 保護者シートの「あそんだ」「せいかい」が常に同値（保護者向け表示のみ・低）

- **場所**: `onCorrect()`（892 で `store.played++; store.correct++` を同時加算）, 表示 `openParents()`（969–970）, `loadQuestion()`（760）。
- **問題（検証済み・重要度 低）**: `played` を増やすのはここだけ＝**常に `played===correct`**。保護者シートの「あそんだ もんだい」と「せいかい」が常に同数で、片方が無意味（保護者は「全問正解している」と誤解）。子のプレイ自体は壊れないので**低**（当初 P1 想定だったが検証で保護者向け表示のみと確定）。
- **修正**: `played` は出題ごとに1回（`loadQuestion()` 先頭で `store.played++; saveStore();`）、`correct` は正解時のみ（`onCorrect()` から `played++` を外す）。リトライで二重計上しないこと。
- **受け入れ条件**: 1回でも間違えると最終的に `played > correct` になりうる。

### P3-2. 「全画面アプリ」を謳う割に standalone メタ無し

- **場所**: `<head>`（4–13）。
- **制約整合**: 完全オフライン PWA は Service Worker（別ファイル）が要り単一ファイル制約に反する → **SW は入れない**。「オフライン」は「一度読めばキャッシュで動く／フォント未取得時はシステム丸ゴへ degrade」の意味と割り切る。
- **修正（単一ファイル維持）**: standalone メタを追加。
  ```html
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="ひらがな" />
  ```
  任意で Android 向け inline data-URI manifest（`display:standalone`）。`apple-touch-icon` は PNG 必須（SVG 不可）なので、綺麗に出すなら base64 PNG を1枚インライン、手間なら省略可。
- **受け入れ条件**: iOS「ホーム画面に追加」→ 全画面 standalone 起動 / 別ファイルを足さない。

---

## 3. 機能追加

> バグ修正ではなく**新規機能**。`store` スキーマ・保護者シート・画面フローに手が入るので上の P 系とは独立に着手可。

### F-1. タイマー（あそぶ じかん）設定 — 保護者によるプレイ時間制限

- **狙い（仕様）**: §2「遊びすぎを避けやすい」/ §12「1回は短く・区切りを明確に」/ §15 保護者「プレイ時間の上限」。
- **設計原則（4歳児向けに重要）**:
  - **子どもにカウントダウンを見せない**（焦り＝集中阻害・§8 に反する）。タイマーは**保護者だけが設定・確認**。
  - **問題の途中で中断しない**。制限到達でも、いまの問題を解き終えた**自然な区切り**でやさしく終了。
  - 既定は **「なし」（オフ）**＝後方互換維持。
  - 集計は **1日合計のアクティブ再生時間**。日付替わりで `todayStamps` 同様リセット。非表示中は加算しない。
  - 代替案: 「1セッションあたり問題数 3/5/8」キャップ（`buildSet` の `SET_SIZE`/`plan` を可変化）でも目的を満たせる。併用も可。

#### (a) 状態スキーマ — `loadStore()`（約 558 行）
```js
if(s.date !== todayStr()){ s.date = todayStr(); s.todayStamps = 0; s.playedMs = 0; } // playedMs も日次リセット
...
if(typeof s.playedMs !== "number") s.playedMs = 0;   // きょうの実プレイ時間(ms)
if(typeof s.limitMin !== "number") s.limitMin = 0;   // 0 = 無制限。5/10/15…
```

#### (b) 計時ロジック（実行時状態の近く）
```js
let playTick=null, tickStart=0;
function startPlayClock(){ if(store.limitMin<=0||playTick) return; tickStart=Date.now(); playTick=setInterval(checkpointPlay,5000); }
function checkpointPlay(){ if(!tickStart) return; const now=Date.now(); store.playedMs+=now-tickStart; tickStart=now; saveStore(); }
function stopPlayClock(){ if(playTick){ checkpointPlay(); clearInterval(playTick); playTick=null; } tickStart=0; }
function timeUp(){ return store.limitMin>0 && store.playedMs>=store.limitMin*60000; }
```

#### (c) フロー結線
- `startSet()` 冒頭: `if(timeUp()){ showRest(); return; }` → その後 `startPlayClock()`。
- `loadQuestion()` 表示後: `startPlayClock()`。
- `nextQuestion()`: 次問ロード前に `checkpointPlay()` → `if(timeUp()){ showRest(); return; }`（途中問題は解き終えているので中断にならない）。
- `showEnd()` 冒頭 / `quit-btn` / `gohome-btn`: `stopPlayClock()`。
- 非表示は非加算:
  ```js
  document.addEventListener("visibilitychange", ()=>{
    if(document.hidden) stopPlayClock();
    else if(screens.quiz.classList.contains("is-active")) startPlayClock();
  });
  ```

#### (d) やさしい終了画面 `screen-rest`（`end` のスタイル流用）
```html
<section class="screen end" id="screen-rest" aria-label="きょうは おしまい">
  <div class="end__emoji" aria-hidden="true">🌙</div>
  <h1 class="end__title">きょうは おしまい</h1>
  <p class="end__count">また あした あそ ぼうね</p>
  <div class="end__actions">
    <button class="btn btn--next btn--soft" id="rest-home-btn">おうちへ</button>
  </div>
</section>
```
```js
const screens = { home:$("screen-home"), quiz:$("screen-quiz"),
  success:$("screen-success"), end:$("screen-end"), rest:$("screen-rest") };
function showRest(){ stopPlayClock(); show("rest"); speak("きょうは おしまい。また あした"); }
$("rest-home-btn").addEventListener("click", ()=>{ renderHome(); show("home"); });
```

#### (e) 保護者シート UI（既存 `.mode-seg`/`.mode-opt` を再利用）
```html
<div class="sheet__row">
  <span class="k">あそぶ じかん</span>
  <div class="mode-seg" id="limit-seg" role="group" aria-label="あそぶ じかんの せいげん">
    <button class="mode-opt" type="button" data-limit="0">なし</button>
    <button class="mode-opt" type="button" data-limit="5">5ふん</button>
    <button class="mode-opt" type="button" data-limit="10">10ぷん</button>
    <button class="mode-opt" type="button" data-limit="15">15ふん</button>
  </div>
</div>
<div class="sheet__row">
  <span class="k">きょう あそんだ じかん</span>
  <span class="v" id="stat-playtime">0ぷん</span>
</div>
```
```js
function applyLimitUi(){
  document.querySelectorAll("#limit-seg .mode-opt").forEach(b=>{
    const on=Number(b.dataset.limit)===store.limitMin;
    b.classList.toggle("is-on",on); b.setAttribute("aria-pressed",String(on)); });
}
document.querySelectorAll("#limit-seg .mode-opt").forEach(b=>{
  b.addEventListener("click",()=>{ store.limitMin=Number(b.dataset.limit); saveStore(); applyLimitUi(); });
});
// openParents() 内: $("stat-playtime").textContent=Math.round(store.playedMs/60000)+"ぷん"; applyLimitUi();
// init 末尾でも applyLimitUi();
```
- **エッジ**: `Date.now()` はアプリ実行時なら可 / 非表示中は非加算 / `limitMin=0` なら計時を一切回さない / 日次リセットに相乗り。
- **受け入れ条件**:
  1. 既定（なし）は従来どおり無制限。
  2. 5ふん 等で、合計プレイ超過時に**いまの問題を解き終えた後**「きょうは おしまい」が出る（途中で切れない）。
  3. 子ども側に時間表示は出ない。
  4. 保護者シートに「きょう あそんだ じかん」が分単位で出る。
  5. 日付が変わるとリセットされ再び遊べる。
  6. バックグラウンド時間は加算されない。

---

## 4. 今後の拡張案（ロードマップ）

> 自動レビューの5レンズ（学習設計・エンゲージメント・たのしさ・保護者価値・新モード）から、効果/労力で選抜。すべて単一ファイル・オフライン・4歳児前提で実現可能なもの。E=労力(S/M/L)、I=効果。

### 厳選アイデア（shortlist）

1. **苦手かな の そっと復習**（E:M / I:高）— `tapLetter()` は「どのかなを何と取り違えたか」を既に知っているのに捨てている。`store.kana`（混同回数マップ）に記録し、`buildSet()` を弱点かなへ**やんわり加重**（`[1,1,2,2,3]` の骨格は維持）。この年齢の記号↔音の定着そのもの。保護者の「にがてな もじ」表示のデータ層も兼ねる。**最も学習価値が高い。** ※ P1-1 の `recordMiss()` がこの入口。
2. **きいて さがそう（リスニング先行・逆モード）**（E:M / I:高）— ひよこが単語を読み上げ、子は絵カードから選ぶ。**読字ゼロ**で非識字児に最適。既存タイル CSS・`speak()`・成功/終了フローを流用、新データ不要。音→意味を鍛える。
3. **おとから さがそう（音→字）**（E:M / I:高）— かなの音を聞いて、その**字形**を選ぶ。今の「絵→綴り」だと単語の形で暗記して読みを迂回できてしまう弱点を補う、読みに直結する音素→書記素リンク。`speak(単一かな)`＋4タイル＋既存 choices の形態を流用。弱点かなデータで駆動可。
4. **ことば図鑑（あつめた ことば）**（E:M / I:高）— 仕様 §15 の自前案。`store.seen` を `onCorrect()` で点灯、絵タイルが**増える一方**（喪失感ゼロ・ダークパターン無し）。「また来たい」理由をストリークやタイマーなしで作る。`.tile`＋`speak()` 流用。
5. **46おん カバレッジ ＋ 保護者向け五十音マップ**（E:M / I:高）— 現40語は seion 46 のうち ~35 しか出ず、`ら/む/ゆ` 等に何週間も出会わない。`WORDS` を 2–3文字・濁点/小書きなしのまま 46 網羅へ拡充し、保護者シートに met/unmet グリッド表示。§6.4「苦手そうな文字」要望にも直結。
6. **むずかしさ ＋ カテゴリー（保護者コントロール）**（E:M / I:高）— `buildSet()` は既にレベル別プール化済みなので、easy/normal/hard の `plan` 差し替えは容易。各語に `category` を足せば「どうぶつだけ」フィルタも可能。子の UI を変えず「うちの子向けに作られている」感＝推薦理由になる。
7. **自分で描かれる花丸 ＋ スタンプ「ドン」**（E:M / I:高）— 花丸は感情のクライマックス。`stroke-dashoffset` で scallop パスを描き起こし、`is-stamping` に合わせて `blip()` に低音の「ドン」を足すと、手描き感・物理感が出る。インライン SVG+CSS+WebAudio のみ、reduced-motion 配慮込みで charm/byte が高い。
8. **あいうえお おえかき（自由なぞり）**（E:M / I:高）— 5問構造のない、好きなかなを選んで何度でもなぞって花丸をもらう穏やかなモード。trace パイプライン全流用。`setupTraceChar` を `current/selected` から分離する小リファクタ＋五十音ピッカーが要る。P1-2 のてがき救済の置き場所としても自然。

### 段階ロードマップ

**now（まず：上の「修正」と同時に着手する核）**
- P1-3 `OVERFLOW_MAX` を ~2.0 に（全塗り合格を止める）
- P1-1 誤答で正解プレフィックスを残す（or 1文字判定）
- P1-2 てがき救済（自動合格/緩和）で詰み防止
- P2-1 `speak()` を 1tick 遅延＋初回タップでプライミング
- P2-3 `maximum-scale=1` 削除 ＋ タイル/ボタンに `touch-action:manipulation`
- P2-6 VS16 絵文字差し替え（☂️→☔, ⛰️→🗻, 🕐→⏰）＋ `さる` の `る/ろ` 解消
- P2-2 「次に必要な文字」を早めに光らせる

**next（学習の芯と保護者価値）**
- 苦手かな記録 `store.kana` ＋ 保護者シートに「にがてな もじ」表示
- P3-1 `played` と `correct` の分離
- 保護者シートをフォーカス管理ダイアログ（or ネイティブ `<dialog>`）に
- ことば図鑑（穏やかな再訪理由）
- 保護者の難易度キャップ ＋ セッション長/タイマー（F-1）
- 自分で描かれる花丸 ＋ スタンプ「ドン」/ 1文字ごとに音程が上がるタップ音

**later（モードと語彙の拡張）**
- `buildSet()` 内での弱点かなの緩いスペースド・リハーサル
- `WORDS` を 46 seion 網羅へ拡充 ＋ 保護者の五十音マップ
- 新モード: きいて さがそう（音→絵）/ おとから さがそう（音→字）/ あいうえお おえかき
- おなじ おとで はじまる / しりとり（音韻意識・拡張語彙が前提）
- 進捗連動の季節テーマ/マスコット仲間アンロック
- 任意・保護者ゲート付きの濁点オンランプ（「点々が付くと音が変わる」ルールとして）

---

## 付録. 触らない方が良いもの（意図的設計）

- 札はタップで消費されない（`もも`・`とまと` の重複文字対応）。仕様通り。
- 不正解で赤バツ・強い失敗演出を出さない。仕様 §7/§8 準拠。**P1-1 を入れても赤バツ禁止は維持**。
- `prefers-reduced-motion` 対応済み。維持。
- 濁点・半濁点・小書きを出さない方針。維持（拡張は別フェーズ・保護者ゲート前提）。

---

## 進捗・推奨着手順

- ✅ **済（コミット `c023a76`）**: now グループ P0-1 / P1-1 / P1-2 / P1-3 / P2-1 / P2-2 / P2-3 / P2-6。実機検証で動作確認済み（コンソールエラー0）。
- ⏳ **次にやる（追修正）**: **P1-2b**（てがきの試行カウントをストローク非依存に）。検証で判明した唯一の不具合。**P1-3 の効果を確実にするため最優先**。
- ⏳ **その後**: P2-4 / P2-5 / P3-1 / P3-2（a11y・保護者表示・PWA メタ）→ F-1 タイマー（独立可）→ 拡張案（`handoff-ideas.md`）。

各修正後、ローカル確認:
```
python -m http.server 8000   # → http://localhost:8000/
```
（音声・フォントは `file://` だと制限されるためサーバ経由推奨。実機 iOS/Android でも要確認：てがき判定の閾値・音声・絵文字表示。）
