# 修正 引き継ぎ書 ⑤（Codex 向け）

対象ファイル: **`index.html`（プロジェクト唯一の実体）**
作成: 2026-06-27 / レビュー: Claude Code（現行 `97417ea` を 8観点マルチエージェント・レビュー＋各指摘を逆検証して照合）
前提: **HEAD = `97417ea`「Add home mode picker, timer reset, and trace cleanup」**（本番反映済み）。
姉妹: [`handoff-fixes.md`](handoff-fixes.md) / [`-2`](handoff-fixes-2.md) / [`-3`](handoff-fixes-3.md) / [`-4`](handoff-fixes-4.md) / [`handoff-ideas.md`](handoff-ideas.md)

> `97417ea` を全体レビューした結果、**クリティカル／詰み状態は無し**（「絶対に詰まらない」は維持されている）。
> 本書は、(1) **確定バグ**（§A・§B）と、(2) **モードを壊さない品質改善**（§C）、(3) **spec／設計判断が要るもの**（§D）に分けて記録する。
> §D には handoff-④ §6 で決めた**「ホームのモードピッカーは現状維持（残す）」方針と競合しうる項目**が含まれる。**勝手に撤去・既定変更しない**こと。実装は §A → §B → §C の順を推奨、§D は着手前に要相談。
> 適用は**行番号でなくコード片一致（Edit）**で。`python -m http.server 8000` で実機相当スモークを取ること。

---

## 0. 大前提（崩さない）
- `index.html` 1ファイルのみ。外部依存追加なし。Service Worker 追加禁止。静的/オフライン/`file://`。
- 主ユーザー=字が読めない4歳児。**赤バツ・強い失敗演出なし**。**「絶対に詰まらない」を守る**。
- 既存の検証済み実装（🏠幽霊スタンプ防止・誤答プレフィックス保持・保護者フォーカストラップ＋inert・played≠correct・ストレージ移行・look-alike除外・calm/big/lefty・iOS音声・stray tap無視・タイル中央寄せ・てがき`traceDoneUnlocked`ラッチ・ホーム選択音・💬/たたく ラベル）を壊さない。

## 1. 一覧

| ID | 優先 | 区分 | 内容 |
|----|------|------|------|
| **A1** | **高** | 確定バグ | `onWrong` だけ追跡外 `setTimeout`。画面遷移後に発火し、**次の問題のタップを無言で消す** |
| A2 | 中 | 確定バグ | てがき **けす連打で「できた」が空白のまま解放**（1ストロークも描かず commit 可能）|
| A3 | 中 | 確定バグ | iOS Safari で `cancel()`→`speak()` 同フレーム＝**発話が無音化**しうる |
| A4 | 中 | 確定バグ | `padDown` に多点タッチガード無し＝2本目の指で**飛び線・進捗巻き戻し** |
| A5 | 中 | 確定バグ | 同じかな語を別絵文字で2回追加でき、**リロードで片方が黙って消える** |
| A6 | 中 | 確定バグ | `profiles.current` 未検証＝壊れた保存で**幽霊プロファイルに保存**（画面に出ない）|
| A7 | 低 | 確定バグ(色) | 「できた」が**白文字 on 緑＝2.45:1**（AA不合格）。1行で直る |
| B1 | 低 | 確定バグ | `tickStart` リーク（`limitMin=0`＋リセットで遊んでいない時間を計上）|
| B2 | 低 | 確定バグ | 成功画面で時間切れ→つぎへで **qIndex++ 後に rest 直行＝1問スキップ** |
| B3 | 低 | 確定バグ | 日付ロールオーバーが**ロード時のみ**＝深夜跨ぎで昨日の時間/スタンプが残る |
| B4 | 低 | 確定バグ | 音OFF起動で `primeSpeech` が走らず、ON 切替時も再試行しない |
| B5 | 低 | 確定バグ | quota/プライベートモードで `setItem` 失敗を握り潰し、**「追加しました」が嘘**になる |
| B6 | 低 | 衛生 | 旧 `hiragana-asobi-v1` キーが移行後も残存（将来 p1 消失時に古い状態が復活しうる）|
| B7 | 任意 | 掃除 | てがき検証簡略化（`totalTraceLen>=70`）で `guideMask`/ダイレーションが**死にコード** |
| C1〜C6 | 低 | 品質改善 | モードを壊さない範囲の調整（§C）|
| D1〜D4 | — | **要相談** | モードの中身/spec整合・ホーム既定（§D・handoff-④方針と関わる）|

---

# §A. 確定バグ修正（最優先〜中）

## A1. `onWrong` の追跡外タイマー（**高**）

- **場所**: `onWrong()`（`function onWrong(){ … setTimeout(()=>{ … }, 620); }`）。
- **現状**: 不正解リカバリの `setTimeout(...,620)` が `solveTimer` に**入っていない**。アプリ内の他の遅延は全て `scheduleSolve`/`clearSolveTimer` 経由でキャンセル可能なのに、ここだけ例外。クロージャは**古い問題**から計算した `keep` を捕まえ、発火時にグローバルの `selected` を `slice(0, keep)` → `renderSlots`。
- **再現**: カードで誤答完成 → 620ms 以内に 🏠（`goHome` は `locked` ガード無し）→ はじめる で新問題 → 子が1〜2文字置く → 残ったタイマーが**新問題のタップを無言で消す**（`keep===0` なら全消去）＋フォーカスが飛ぶ。
- **修正**: `setTimeout` を `scheduleSolve` に置換（`goHome/startSet/switchProfile` の `clearSolveTimer` で確実にキャンセル）。保険として `is-active` ガードも追加。
  - **現状**:
    ```js
    setPeepMood("think");
    setTimeout(()=>{
      slots.classList.remove("is-wrong");
      selected = selected.slice(0, keep);
      renderSlots(false);
      updateHintGlow();
      focusNextHint();
      locked = false;
    }, 620);
    ```
  - **修正**:
    ```js
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
    ```
- **注意**: `judge` は `scheduleSolve` 経由で呼ばれ、その時点で `solveTimer` は既に null 化済みなので、`onWrong` の `scheduleSolve` と競合しない（誤答リカバリ中は `locked=true` で新たな solve も走らない）。
- **受け入れ条件**: 誤答後 620ms 以内に 🏠→はじめる→数文字タップしても、**新問題の入力が消えない／フォーカスが飛ばない**。通常の誤答→やさしく戻す動作は不変。

## A2. てがき「けす」連打で空白 commit（中）

- **場所**: `$("clear-btn").addEventListener("click", …)` 末尾の `noteTraceAttempt()`。
- **現状**: clear ハンドラが `noteTraceAttempt()` を呼び `traceAttempts` を増やす。**1ストロークも描かず けす を5回**叩くと `TRACE_AUTO_ATTEMPTS`(5) 到達で `traceDoneUnlocked=true` → **空のパッドで「できた」commit**。↺ は4歳児が大好きな場所。「絶対に詰まらない」は**時間ベースの自動解放（`startTraceHelp` の ~24秒）**で別途担保されているので、けす起点の解放は不要。
  - **現状**:
    ```js
    updateTraceDoneUi(false);
    noteTraceAttempt();
    });
    ```
  - **修正**（けすを「試行回数」に数えない）:
    ```js
    updateTraceDoneUi(false);
    $("message").textContent = "もういちど なぞってね";
    });
    ```
- **補足**: これで `noteTraceAttempt()` の唯一の呼び出し元が無くなる（関数自体は残しても無害だが、**任意で関数定義ごと削除可**）。`stopTraceDemo()`（ハンドラ冒頭）が薄いガイド再描画を既に行うので追加描画は不要。
- **受け入れ条件**: 何も描かず けす を何回叩いても「できた」は**有効化されない**。実際になぞれば従来通り有効化。字から外し続けても**~24秒で**「できた」が押せる（詰まない）は維持。

## A3. iOS Safari の `cancel()`→`speak()` レース（中）

- **場所**: `speak(text, rate)`。
- **現状**: `if(speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();` の直後、**同じ tick** で `speechSynthesis.speak(u)`。iOS では `cancel()` が非同期のため、エンジン teardown 中の `speak()` が無言で捨てられる（`speakWordSlow` の 520ms 連打・高速ダブルタップで顕在化）。
  - **現状**:
    ```js
    const seq = ++speechSeq;
    if(speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(sayText(text));
    u.lang = "ja-JP";
    if(jaVoice) u.voice = jaVoice;
    u.rate = rate || 0.95;  // natural speed
    u.pitch = 1.0;          // natural pitch (was 1.15 — sounded squeaky)
    u.volume = 0.9;
    if(seq !== speechSeq || !store.soundOn) return;
    try{ speechSynthesis.resume(); }catch(e){}
    speechSynthesis.speak(u);
    ```
  - **修正**（busy のときだけ1tick遅延、`speechSeq` ガードは維持）:
    ```js
    const seq = ++speechSeq;
    const busy = speechSynthesis.speaking || speechSynthesis.pending;
    if(busy) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(sayText(text));
    u.lang = "ja-JP";
    if(jaVoice) u.voice = jaVoice;
    u.rate = rate || 0.95;  // natural speed
    u.pitch = 1.0;          // natural pitch (was 1.15 — sounded squeaky)
    u.volume = 0.9;
    const fire = ()=>{
      if(seq !== speechSeq || !store.soundOn) return;
      try{ speechSynthesis.resume(); }catch(e){}
      speechSynthesis.speak(u);
    };
    if(busy) setTimeout(fire, 60); else fire();
    ```
- **受け入れ条件**: iPhone 実機で、文字連続タップ／`speakWordSlow`（おみみ・拍手完了）で**各かなが安定して鳴る**。最新の発話が古い発話を上書きする挙動は維持。

## A4. `padDown` の多点タッチガード（中）

- **場所**: `padDown(e)` 冒頭の `if(traceBusy) return;` と `padMove(e)` 冒頭の `if(!drawing) return;`。
- **現状**: 2本目の接触（添えた指・手のひら）が新 `pointerdown` を発火し、`drawing=true`・`curStrokeLen=0`・`lastXY` 移動・新 `pointerId` で `setPointerCapture` を再実行 → **カンバスを横切る飛び線**＋進行中ストロークのリセット。`touch-action:none` はスクロールを止めるが2本目の指は止めない。
  - **修正**:
    ```js
    function padDown(e){
      if(traceBusy || drawing || e.isPrimary===false) return;
    ```
    ```js
    function padMove(e){
      if(!drawing || e.isPrimary===false) return;
    ```
- **受け入れ条件**: タブレットで指/手のひらを添えても**飛び線が出ず**、1ジェスチャ＝1ストロークが保たれる。

## A5. 重複カスタム語の黙った消失（中）

- **場所**: `addCustomWord()`（`sameEmoji` ガードの直後）。
- **現状**: 絵文字の重複だけ弾き（`w.emoji===emoji && w.word!==word`）、**同じ語＋別絵文字**は2回追加できる。両方「を追加しました」を表示するが、`loadStore` の dedup は `seenWord` でも弾くため、リロードで**片方が黙って消える**。
  - **現状**:
    ```js
    const sameEmoji = (store.customWords||[]).find(w=>w.emoji===emoji && w.word!==word);
    if(sameEmoji){
      setCustomFeedback(emoji+" は "+sameEmoji.word+" で使っています");
      return;
    }
    ```
  - **修正**（push 前に語の重複も弾く＝add時とload時の整合を取る）:
    ```js
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
    ```
- **受け入れ条件**: 既存と同じ語を追加しようとすると「〜は もう あります」で弾かれ、**リロードで語が消えない**。

## A6. `profiles.current` 未検証（中）

- **場所**: `loadProfiles()`。
- **現状**: `items` が非空配列であることだけ検証し、`current` が `items` 内の id か確認しない。壊れた/手編集の保存で `current` が存在しない id を指すと、`activeProfileId` がダングリング → `storeKey()` が幽霊スロットを指し、プロフィール行はどれも `is-on` にならず、**進捗が画面に出ないキーへ保存**される。
  - **現状**:
    ```js
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if(p && Array.isArray(p.items) && p.items.length) return p;
    ```
  - **修正**:
    ```js
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if(p && Array.isArray(p.items) && p.items.length){
      if(!p.items.some(it=>it && it.id===p.current)) p.current = p.items[0].id;
      return p;
    }
    ```
- **受け入れ条件**: `current` が無効でも先頭プロフィールにフォールバックし、行のハイライトと保存先が一致する。

## A7. 「できた」ボタンのコントラスト（低・1行）

- **場所**: `.trace-done-btn{ … color:#fff; }`。
- **現状**: 白文字 on `--good`(#5FB872) = **2.45:1**（AA 不合格／大文字 3.0 も割る）。子がてがきを進める唯一のボタン。
  - **修正**（緑のまま文字だけ濃く＝ink で 4.39:1, AA合格）:
    ```css
    .trace-done-btn{
      background:var(--good);
      box-shadow:0 5px 0 #4C9D5E,0 9px 16px rgba(76,157,94,.22);
      color:var(--ink);
    }
    ```
- **受け入れ条件**: 「できた」のラベルが緑地でもはっきり読める（無効時の灰色との区別も維持）。

---

# §B. 確定バグ・小（§A と同PR可、または別PR）

## B1. `tickStart` リーク（低）

- **場所**: `resetPlayTimer()` の `if(playScreenActive()) tickStart = Date.now();`。
- **現状**: `limitMin===0` だと `startPlayClock` は interval を作らないのに、リセット押下で `tickStart` だけ立つ。次の `checkpointPlay`（`nextQuestion`/`openParents`）が遊んでいない時間を `playedMs` に計上し、制限再設定時に `timeUp` を早く踏む。
  - **修正**: `if(playTick) tickStart = Date.now();`（interval が実在する時だけ計時開始）。
- **受け入れ条件**: 「なし」→リセット→制限再設定で、遊んでいない時間が計上されない。

## B2. つぎへで1問スキップ（低）

- **場所**: `nextQuestion()`。
- **現状**: `qIndex++` の後に `timeUp()` で `showRest()`。成功画面を眺めている間に時間切れになると、次の `qIndex` を**消費してから** rest へ飛び、その問題が表示されずに進捗が飛ぶ。
  - **現状**:
    ```js
    function nextQuestion(){
      checkpointPlay();
      qIndex++;
      if(qIndex >= SET_SIZE){ showEnd(); }
      else if(timeUp()){ showRest(); }
      else { loadQuestion(); }
    }
    ```
  - **修正**（rest 分岐では未表示の問題を消費しない）:
    ```js
    function nextQuestion(){
      checkpointPlay();
      qIndex++;
      if(qIndex >= SET_SIZE){ showEnd(); }
      else if(timeUp()){ qIndex--; showRest(); }
      else { loadQuestion(); }
    }
    ```
- **受け入れ条件**: セット完了の祝福（`showEnd`）優先は維持。途中の時間切れで問題が無言スキップされない。

## B3. 日付ロールオーバーがロード時のみ（低）

- **場所**: `checkpointPlay()`。
- **現状**: 日次リセット（`s.date!==todayStr()` で `todayStamps/playedMs` を 0）は `loadStore` でしか走らない。深夜跨ぎの連続プレイで昨日の `playedMs` が今日の制限に加算され、`きょうは おしまい` が誤発火。
  - **修正**:
    ```js
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
    ```
- **受け入れ条件**: 端末を跨いで開きっぱなしでも、日付が変われば時間/スタンプがリセットされる。

## B4. 音ON切替で `primeSpeech` 再試行（低）

- **場所**: `toggleSound()`。
- **現状**: `primeSpeech` は `!store.soundOn` で早期 return するため、ミュート起動だと priming が走らず、ON にしても再試行しない。厳格な iOS では ON 直後の非ジェスチャ発話がブロックされうる。
  - **修正**:
    ```js
    function toggleSound(){
      store.soundOn = !store.soundOn; saveStore(); applyMuteUi();
      if(!store.soundOn) stopSpeaking();
      else primeSpeech();
    }
    ```
- **受け入れ条件**: ミュート起動→ON 後、最初の読み上げが鳴る（`primeSpeech` は二重呼び安全）。

## B5. quota/プライベートモードで嘘の成功表示（低）

- **場所**: 起動処理（`let store = loadStore(); saveStore();` 付近）＋ `addCustomWord()`。
- **現状**: 全 `setItem` が空 `catch` で握り潰し。Safari プライベート等で保存に失敗しても「を追加しました」と出て、次回起動で消える。
  - **修正**（新規HTML不要・起動時に1回プローブし、フィードバック文言を分岐）:
    ```js
    // loadStore のあと、store 定義付近に追加
    let storageOk = true;
    try{ localStorage.setItem(BASE_STORE_KEY+"-probe","1"); localStorage.removeItem(BASE_STORE_KEY+"-probe"); }
    catch(e){ storageOk = false; }
    ```
    ```js
    // addCustomWord(): 末尾の setCustomFeedback を分岐
    setCustomFeedback(storageOk ? (word+" を追加しました") : "この端末では ほぞんできません");
    ```
- **受け入れ条件**: プライベートモードで追加すると「ほぞんできません」と正直に出る。通常時は従来通り。

## B6. 旧キーの残存（低・衛生）

- **場所**: `loadStore()` のレガシー・フォールバック分岐＋起動時 `saveStore()`。
- **現状**: 移行後も `hiragana-asobi-v1`（無印）が削除されず残る。将来 `…-p1` が外的に消えると古いスナップショットが復活しうる（アプリ内に消す経路は無いので低）。
  - **修正**（移行が実際に起きた時だけ、初回保存後に旧キーを削除）:
    ```js
    // モジュール変数を1つ追加
    let migratedLegacy = false;
    ```
    ```js
    // loadStore のフォールバック分岐
    if(!Object.keys(s).length && activeProfileId==="p1"){
      try{ s = JSON.parse(localStorage.getItem(BASE_STORE_KEY)) || {}; }catch(e){ s={}; }
      if(Object.keys(s).length) migratedLegacy = true;
    }
    ```
    ```js
    // let store = loadStore(); saveStore(); の直後
    if(migratedLegacy){ try{ localStorage.removeItem(BASE_STORE_KEY); }catch(e){} }
    ```
- **受け入れ条件**: 旧版からの移行後、無印キーが消える。新規インストールでは何も起きない。

## B7. てがき死にコード掃除（任意）

- **背景**: 検証は現在 `checkTrace` の `totalTraceLen >= 70` のみ。`setupTraceChar` の `getImageData` → `guidePts` → `guideMask` ダイレーション（`TOL` 二重ループ）は構築されるが、**`guideMask` は読まれず**、`guideArea` も `!guideArea` ガードにしか使われない。
- **方針（任意・急がない）**: カバレッジ検証を将来入れないなら、`guideMask` 構築（`const GW=PAD/4, TOL=5; … guideMask[…]=1;`）を削除。`guideArea`/`guidePts` は `!guideArea` ガード用に残すか、ガードを別フラグに置換。**`willReadFrequently:true` で readback コストは緩和済み**なので緊急性は低い。`committedStrokes`・`strokesNeededFor`・`segmentLen`/`strokeLen` も未使用なら同時に整理可。
- **受け入れ条件**: てがきの合否挙動は不変（`totalTraceLen>=70`）で、未使用コードが減る。

---

# §C. 品質改善（モードを壊さない・実装可）

> いずれも spec 寄り・子の体験改善で、handoff-④「ピッカー現状維持」方針とは**競合しない**。§A/§B 後に着手可。

- **C1. 「できた」早押しに無反応ではなくナッジ**: 無効ボタンは押しても何も起きず、説明文も読めない。早押し時に `speak("なぞってね")` ＋ガイド点滅を出す（自動解放は維持）。場所: `trace-done-btn` ハンドラ／`updateTraceDoneUi`。
- **C2. 拍手/おみみで `listen-btn` を隠す**: `loadQuestion` は各 answer-area を per-mode で隠すが `listen-btn`（常に `speak(current.word)` 全語）は隠さない。拍手は「数える」課題、おみみは絵を隠す課題なのに、子が全語を何度でも露出できる。`$("listen-btn").hidden = ["clap","mirror","ear"].includes(mode);` を per-mode トグル付近に1行（おみみは `ear-repeat-btn` が別途ある）。
- **C3. 基本「ふだ」の plan**: `buildSet` の `plan=[1,1,2,2,3]` は基本モードでも毎回3文字で終わる。基本は `[1,1,2,2,2]` にし、3文字は「3もじ」モードと自然なレベルランプに任せる（spec「3文字は少なめ・別ステップ」）。
- **C4. teach の誤答札**: `renderTeach` の `wrongPool[0]` は単語内の実在文字になりがち（さかな→「かかな」で さ vs か）。`current.choices.filter(ch=>!current.word.includes(ch))[0] || wrongPool[0] || KANA_POOL.find(...)` を優先。
- **C5. カスタム語の挿入位置**: `buildSet` は custom 語を**必ず第1問**に強制し、難易度ランプを崩し最後の level-3 を押し出す。長さに応じた plan 位置へ挿入（または plan 枠を1つ置換）。
- **C6. 新フレンドの光**: `renderHill` 末尾で毎回 `store.lastFriend=""` を保存するため、2回目の home 描画で glow が見られず消える。クリアを「home 表示後1描画」に分離、または描画時のタイムスタンプ比較に。

---

# §D. 要相談（spec／設計・handoff-④方針と関わる）

> **handoff-④ §6「ホームのモードピッカーは現状維持（残す）」と競合しうる**。実装前に方針確認すること。コードは触らず、判断材料のみ記す。

- **D1. 「おみみ」モードに課題が無い**: `ear-btn` は 👂 を1タップで `onCorrect` 直行。絵も答えも出さず、誤答も無い。spec の中核ループ「絵/音をヒントにひらがなを順番に選ぶ」が不在なのに、本物の綴りと同じ花丸＆フレンドを付与。**案A**: 読み上げ後に絵カード2〜3枚を出して選ばせる本物の課題にする。**案B**: ear をホーム/保護者の選択肢から外す。→ **どちらも「モードを残す/減らす」判断なので相談**。
- **D2. 全モード同一報酬**: `onCorrect` が全モード共通で `todayStamps`・`friends`・`correct` を加算。ear の1タップも本物の綴りと同価値で、フレンドの丘とスタンプが「努力」と無関係になる。→ フレンド/スタンプを cards/cards3/trace に限定するか、補助モードは軽い賞賛のみ、等。報酬設計の方針判断。
- **D3. ホームに7モードを字の読めない子へ直接提示**: spec「避けること: 多すぎるメニュー／1画面に詰め込みすぎない」。🃏/🔤・↔/💬 は4歳児に区別困難で、拍手/向き/おみみは目的が他モードと別なのに音声オンボーディングが無い。**最小案**は `defaultStore().homeModes` を `HOME_MODE_KEYS.slice()` → `['cards']`（または `['cards','cards3']`）にし、追加は既存の保護者トグルでオプトイン。→ **handoff-④「現状維持」と正面から競合するため要判断**。
- **D4. clap/mirror で答え漏れ／trace の寛容さ**: `loadQuestion` が常に絵＋単語読み上げを出すため、拍手（拍数を聞く）・向き（かなを当てる前に絵と音で特定）で答えが漏れる。`dataset.mode` でヒント描画と自動発話を mode 別にゲートする案。あわせて trace は70pxの落書きでも合格（`guideMask` 不使用）= 寛容さは意図的だが、カバレッジ検証を戻すかは設計判断。→ 各モードの「テストしたいスキル」を明確化したうえで相談。

---

## 6. 触らない / 確認済み（レビューで「問題なし」と確定）
- **XSS なし**: カスタム語/絵文字/プロフィールは全消費経路が `textContent`/`setAttribute`。mirror の `innerHTML` も `validCustomWord`（`/^[あ-ん]{2,4}$/` ＋ `KANA_POOL` 限定）でHTML特殊文字が入らない。**`validCustomWord` を緩める時は mirror sink（`b.innerHTML="<span>"+mirrorAnswer+"</span>"`）も同時に見直す**こと（結合に注意）。
- 詰み状態・無限ループ・データ破壊は無し。保護者フォーカストラップ＋inert・iOS音声 priming・stray tap 無視・誤答プレフィックス保持は健在。
- `WORDS` に spec 表の `そら` は未収録だが、語リストは進化済みで無害（対応不要）。

## 7. Codex に渡す用（コピペ可）
> `docs/handoff-fixes-5.md` を読み、**§A（A1→A2→A3→A4→A5→A6→A7）を1PR**で実装してください（前提 HEAD `97417ea`）。
> 制約: `index.html` 1ファイルのみ・外部依存/SW追加なし・**行番号でなくコード片一致で編集**・**赤バツを出さない**・§0 の既存実装を壊さない。
> §B（B1〜B6・小さな確定バグ）は同PRに含めても、別PRでも可。**§B7 掃除・§C 品質改善は任意**。**§D はモード設計でハンドオフ④の「ピッカー現状維持」方針と競合しうるため、着手前に必ず相談**（コードを変えない）。
> 検証: `python -m http.server 8000` で起動し、(A1) 誤答→620ms以内に🏠→はじめる→数文字タップで**入力が消えない**、(A2) 何も描かず けす 連打で「できた」が**有効化されない**／字から外し続けても~24秒で押せる、(A3) iPhone実機で連続発話が鳴る、(A4) 指を添えても飛び線が出ない、(A5) 同じ語の二重追加が弾かれる、を確認。**この §A で1PR**。
