# 修正 引き継ぎ書 ⑦（Codex 向け）

対象ファイル: **`index.html` / `styles.css` / `src/*.js` / `sw.js` / `assets/`（モジュール化後）**
作成: 2026-06-27 / レビュー: Claude Code — **ultracode マルチエージェント**（10観点を並列レビュー → 各所見を逆検証、計34エージェント）＋ `python -m http.server` 実機スモーク
基準: **`main` 先端 `d6482fd`「Modularize into no-build ESM; service worker, recorded audio, tests」**（本番反映済み）
最終追記: 2026-06-27 / **§A〜§C は Codex が修正済み**（§D は設計判断として未実装）
姉妹: [`-5`](handoff-fixes-5.md) / [`-6`](handoff-fixes-6.md)（モジュール化の計画§7＋実施§8） / [`handoff-ideas.md`](handoff-ideas.md)

> **総評（修正後）**: モジュール化リファクタ（`d6482fd`）は**忠実な機械的抽出**で、`MODE_DEFS`(R2)・`timers.js`(R1) は健全。初回レビューで検出した `navLock` / `suppressClick` の「掃かれて消える必要な状態リセット」は本周回で修正済み。SW 更新方式・録音音声カバレッジ・maskable アイコン・発話停止・`renderEar` 重複設定も反映済み。
> **§D は設計判断（要相談）**でコードを触らない。今回の検証は `npm.cmd test`（14/14）＋ `node --check`。実機ブラウザ操作は Codex 側のブラウザ接続が不安定で途中停止したため、A1/B1 は追加した静的回帰テストで再発防止を固定した。
> **追記（Claude Code 実機検証 2026-06-27）**: 修正後コードを `python -m http.server` ＋ Playwright で確認。**A1 は修正前に再現していた詰み（`nextButtonWorks:false`）が解消（`afterNext:quiz` / `nextButtonWorks:true`）**。カード5問通し（花丸5）・録音音声マニフェスト 101 件（`どっちかな`/`もういっかい`/`こっちかな？`/`よくみてみよう`/`かいてね`/`なぞってね` すべて HIT）・**コンソール 0 件**。§A〜§C は検証済み。

---

## 0. 大前提（崩さない）
- **構成**: no-build マルチファイル（`index.html`＋`styles.css`＋`src/*.js`（ESM）＋`sw.js`＋`assets/`）。**バンドラ/フレームワーク/ビルド工程は入れない**。静的・GitHub Pages（main push → fragmentgithub.github.io/**AIRH**/、**/AIRH/ サブパス配信**）。**ESM のため `file://` 直開き不可＝ローカルは必ずサーバ**。
- 主ユーザー＝字が読めない4歳児。**赤バツ・強い失敗演出なし**。**「絶対に詰まらない」を守る**（§A1 は本周回で修正済み）。
- 既存の検証済み実装を壊さない（🏠幽霊スタンプ防止・誤答プレフィックス保持・フォーカストラップ＋inert・ストレージ移行＋旧キー削除・look-alike 除外・iOS音声 priming・stray tap 無視・てがき24秒自動解放＋ラッチ・報酬は cards/trace 限定）。
- **R1 原則（重要）**: `after()`/`cancelAllPending()` は**ゲームループの遅延**用（遷移で掃く）。**UI ガード/デバウンス（`navLock` 解除・`suppressClick` 解除）は掃かれてはならない＝生 `setTimeout` を使う**。§A1/§B1 はこの原則違反。

## 1. 一覧

> **状態**: 以下の §A〜§C は初回レビュー時点の指摘と修正方針。2026-06-27 の Codex 修正で §A〜§C は反映済み。§D は要相談のまま。

| ID | 優先 | 区分 | 内容 |
|----|------|------|------|
| **A1** | **高** | 確定バグ(詰み) | `navLock` 解除の `after(400)` が `cancelAllPending()` に掃かれ、**せいかいの「つぎへ」が永久死＝詰み**（実機再現済み）|
| B1 | 中 | 確定バグ | `suppressClick` 解除も同様に掃かれ、**cards/teach のタップが無反応**になりうる |
| B2 | 中 | 確定バグ(運用) | SW が純 cache-first＋手書き `CACHE_VERSION`＝**バンプ忘れで旧版を配信し続ける** |
| B3 | 中 | 確定バグ(音) | `generate-audio.mjs` の収集漏れで **mirror「どっちかな」/誤答/てがき per-letter の録音が無く、無音声端末で鳴らない** |
| C1 | 低 | 確定バグ(表示) | manifest の maskable アイコンに safe-zone 無し＝**クレストが切れる** |
| C2 | 低 | 掃除 | `startSet`/`showRest` に `stopSpeaking()` 無し（他遷移と非対称・発話の鳴り残り）|
| C3 | 低 | 掃除 | `renderEar` が `MODE_DEFS` 既定値を再設定＝**R2 テーブルを無効化**（将来の不整合源）|
| D1〜D4 | — | **要相談** | iOSオフライン音声・報酬副作用・clap発話・純ロジックのテスト不能（§D）|

---

# §A. 確定バグ（最優先）

## A1. `navLock` 解除が掃かれ、せいかいで「つぎへ」が永久死＝詰み（**高・実機再現済み**）

- **場所**: `#next-btn` クリックハンドラ（`src/main.js`、`/* wire up */` 内）。
- **現状**: 二重タップ防止 `navLock` の唯一の解除が `after(400, …)`。`after()` は `pendingTimers` に登録され、`clearGameTimers()`→`cancelAllPending()` が**全消去**する。`showEnd()` は `clearGameTimers()` を呼ばないが、`startSet()`/`goHome()`/`showRest()`/`loadQuestion()` は呼ぶ。
- **再現（確認済み）**: 5問目のせいかいで **「つぎへ」**（→`nextQuestion`→`showEnd`、ここで `after(400)` の navLock 解除を予約）→ **400ms以内に「もういちど」**（→`startSet`→`clearGameTimers`→`cancelAllPending` が解除を掃く）。以降 `navLock` は **true のまま固定**。次セット以降、せいかい画面の「つぎへ」は `if(navLock) return;` で無反応になり、**success 画面には他のボタンが無い＝完全に詰む**（自動検証で `afterNext: success` / 2回目タップも `success` のまま）。`end/rest → おうちへ` を 400ms以内に押す経路も同根。pre-refactor（`53b7e64`）は生 `setTimeout` で必ず解除されていた＝**リファクタが作り込んだ回帰**。
  - **現状**:
    ```js
    $("next-btn").addEventListener("click", ()=>{
      if(navLock) return;
      navLock = true;
      nextQuestion();
      after(400, ()=>{ navLock = false; });
    });
    ```
  - **修正（デバウンスは掃かれてはいけない＝生 `setTimeout`）**:
    ```js
    $("next-btn").addEventListener("click", ()=>{
      if(navLock) return;
      navLock = true;
      nextQuestion();
      setTimeout(()=>{ navLock = false; }, 400); // UIデバウンス: cancelAllPending に掃かれてはいけない
    });
    ```
  - **防御（推奨・併用）**: `goHome()` と `startSet()` の `clearGameTimers();` の直後に `navLock = false;` を追加（おしまい/きょうはおしまい 経由の再入を自己修復）。**`loadQuestion()`/`clearGameTimers()` には入れない**（`next→loadQuestion` 連鎖でデバウンスが即無効化されるため）。
- **受け入れ条件**: 5問目せいかい「つぎへ」→400ms以内「もういちど」→ 新セットのせいかいで「つぎへ」が**毎回1タップで前進**。`end/rest→おうちへ` を400ms以内でも次セットの「つぎへ」が生きている。回帰テスト案（`test/timers.test.js` 流儀）: `after(400,reset)` 予約→`navLock=true`→`cancelAllPending()`→新リセット経路（生setTimeout/`startSet`/`goHome`）後に `navLock===false`。

---

# §B. 確定バグ（中）

## B1. `suppressClick` 解除も掃かれ、cards/teach のタップが無反応になりうる（中）

- **場所**: `bindPreview` の `cancel()`（`after(80, …)`）と `startDwell` の `cancel()`（`after(100, …)`）。
- **現状**: 長押しプレビュー/dwell が `suppressClick=true` にし、解除は上記 `after()` のみ。遷移が 80〜100ms 窓に重なると解除が掃かれ、`suppressClick` が true のまま**問題をまたいで持ち越す**（`loadQuestion` は reset しない）。以降 cards のタイル `click` は `if(!suppressClick) tapLetter()` で**無反応**（teach も cards-area 共用）。具体到達: `bindPreview` の pointerdown は `locked` を見ないため、誤答/正答の `scheduleSolve` 保留中に長押しプレビューが発火→solve が `onCorrect→showSuccess`/`loadQuestion` で掃く、という経路がある。`mirror/clap/ear/teach` の pick は `suppressClick` を見ないので**影響は cards のタイルのみ**。
- **修正（原則：ガード解除は生 `setTimeout`）**:
  ```js
  // bindPreview の cancel():
  const cancel=()=>{ if(timer){ cancelAfter(timer); timer=null; } setTimeout(()=>{ if(previewed) suppressClick=false; }, 80); };
  // startDwell の cancel():
  setTimeout(()=>{ if(done) suppressClick=false; }, 100);
  ```
  （長押し本体 `timer=after(450/700,…)` は `after` のまま＝遷移で掃いてよい。解除だけ生に。）
  **併用推奨（保険）**: `loadQuestion()` 冒頭の `clearGameTimers();` 直後に `suppressClick=false;` を追加（問題間の wedge を確実に解消。これは `navLock` と違いデバウンスを壊さない）。
- **受け入れ条件**: タイルを長押し→離して直後に遷移しても、次問でタイルの単タップが**1回で効く**。プログラム的には `loadQuestion()` 後 `suppressClick===false`。

## B2. SW が cache-first＋手書き `CACHE_VERSION`＝更新漏れで旧版を配信し続ける（中・運用）

- **場所**: `sw.js`（`CACHE_VERSION` リテラル＋`fetch` ハンドラ）。
- **現状**: `fetch` は純 cache-first（`const cached=await cache.match(request); if(cached) return cached;`＝再検証なし）。`CACHE_VERSION="hiragana-asobi-v1-2026-06-27"` は手書き日付。`install` で `skipWaiting`、`activate` で `clients.claim` するが、**新 SW は `sw.js` のバイトが変わった時しか install されない**。将来 `styles.css`/`src/main.js` だけ変えて日付文字列を更新し忘れると、`sw.js` が同一＝install されず、**復帰ユーザ（＝毎日アプリに戻る4歳児）に旧アセットが永続配信**。アプリ内に更新導線も無い（登録は `.catch(()=>{})`）。本プロジェクトの「main push でデプロイ」と最も相性が悪い実運用の落とし穴。
- **修正（推奨・no-build）**: コード/JSON/ナビゲーションは **stale-while-revalidate**、不変な wav は cache-first 維持。
  ```js
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);
    const url = new URL(request.url);
    const isCode = request.mode === "navigate" || /\.(html|css|js|json)$/.test(url.pathname);
    if (cached && !isCode) return cached;                 // 不変アセット（wav等）は即返し
    const net = fetch(request).then((res)=>{
      if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
      return res;
    }).catch(()=>null);
    return cached || (await net) ||
      (request.mode === "navigate" ? cache.match("./index.html") : Promise.reject(new Error("offline")));
  })());
  ```
  **代替（最小・併用可）**: README のデプロイ節に「push のたびに `CACHE_VERSION` を更新」を明記（現状は handoff にしか無い）＋（任意）pre-push/CI で「追跡アセットが変わったのに `CACHE_VERSION` 不変なら fail」ガード。
- **受け入れ条件**: `CACHE_VERSION` を変えず `src/main.js` を1バイト変更してデプロイ→ 復帰クライアントが**最大1リロードで新版**を取得（SWR）。または cache-first 維持なら CI/手順で「アセット変更時は必ず版が変わる」ことを担保。

## B3. 録音音声カバレッジ漏れ（根本: `generate-audio.mjs` の収集漏れ）（中）

- **場所**: `scripts/generate-audio.mjs`（収集が `src/main.js` の `speak("リテラル")`・WORDS・KANA_POOL のみ）。
- **現状**: 次の発話に対応する wav とマニフェスト・キーが**無い**ため、`speak()` が録音にフォールバックする端末（ja 音声が無い＝iOS等）で**無音**になる:
  - **mirror「どっちかな」**（`src/modes.js` の `speech:"どっちかな"`を `speak(modeDef.speech)` で発話。mirror は絵・語を隠すので音が唯一の手掛かり）→ 影響大。
  - **誤答 `MSG_WRONG`**（`speak(msg)` 変数）→「もういっかい」等が無音（画面表示はあるので低）。
  - **てがき per-letter**（`speak(ch+"、かいてね")` / `speak(ch+"、なぞってね")` 連結）→ 初回の運筆指示が無音（同画面の静的「ここを なぞってね」等は録音済みで部分緩和、低）。
  - ※ `MSG_RIGHT` は発話されない（`textContent` のみ）ので対応不要。
- **修正（generator 拡張＝根本対策）**:
  ```js
  // modes.js の speech リテラルも収集（sentinel 除外）
  const modesSrc = fs.readFileSync("src/modes.js","utf8");
  for(const m of modesSrc.matchAll(/speech:\s*"([^"]+)"/g)){ if(m[1]!=="word" && m[1]!=="slow-word") texts.add(m[1]); }
  // MSG_WRONG 配列
  const mw = source.match(/const MSG_WRONG = \[([^\]]+)\]/);
  if(mw){ for(const s of mw[1].matchAll(/"([^"]+)"/g)) texts.add(s[1]); }
  ```
  てがき per-letter は**(b)推奨**: `src/main.js` の `speak(ch+"、かいてね")`/`speak(ch+"、なぞってね")` を「`speakKana(ch); after(420,()=>speak("かいてね",0.85))`」の2発話に分割（"なぞってね" は既出、"かいてね" だけ新規・既存の per-kana wav を再利用、manifest 肥大なし）。(a)案は generator で KANA_POOL×接尾辞を列挙（46×2 個増）。
  さらに `test/audio-manifest.test.js` を追加し、必須フレーズ（`どっちかな`・`MSG_WRONG` 3語・てがき接尾辞・5文）が manifest キーに在ることをアサート（将来の漏れを CI で検出）。
- **受け入れ条件**: `npm run generate-audio` 後、manifest に「どっちかな」「もういっかい」「こっちかな？」「よくみてみよう」等が在り対応 wav も存在（`sw.js` が `Object.values(manifest)` をプリキャッシュ）。ja 音声無しの端末で mirror/誤答/てがきの音が鳴る。

---

# §C. 低・掃除

## C1. maskable アイコンに safe-zone が無く切れる（低・表示）
- **場所**: `assets/manifest.webmanifest`（`"purpose":"any maskable"`）＋ `assets/icon.svg`。
- **現状**: maskable はランチャが中央 ~80%（半径 ~205/512）に丸/角丸マスクするが、ひよこの**クレスト（とさか）が safe-zone を超え**切れる（頭の円は範囲内）。
- **修正**: 当面は `"purpose":"any"` に変更（最小・安全）。真の maskable が欲しければ、全体を中央 ~0.78 倍に収めた専用 maskable アイコンを別エントリで追加。
- **受け入れ条件**: DevTools → Application → Manifest の maskable プレビューでクレストが切れない、または maskable 宣言を外す。

## C2. `startSet`/`showRest` に `stopSpeaking()` が無い（低・掃除）
- **現状**: `goHome`/`switchProfile` は `stopSpeaking()` を呼ぶが、`startSet`（=はじめる/もういちど）と `showRest` は呼ばない。おしまいの「よく できました」発話中に「もういちど」を押すと**鳴り残る**（次の `speak` が busy 時 `cancel()` するので概ね自己修復＝音の対称性のみ）。
- **修正**: `startSet` 冒頭（`clearGameTimers` 前）と `showRest` 冒頭に `stopSpeaking();` を追加（idempotent）。
- **受け入れ条件**: おしまいで「よく できました」発話中に「もういちど」→ 発話が即停止し次セット冒頭に被らない。

## C3. `renderEar` が `MODE_DEFS` 既定値を再設定（低・掃除）
- **現状**: `renderEar()` 冒頭の4行が `hint-emoji`(👂/aria おみみ)・`prompt-text`(きいて えらぼう)・`ear-btn` aria を再設定するが、**`loadQuestion` が `MODE_DEFS` から既に同値を設定済み**（`ear-btn` aria は `index.html` で静的設定済み）。値が同じなので無害だが、**R2 テーブルを無効化**＝将来 `modes.js` で ear の prompt/hint を変えても renderEar に上書きされる不整合源。
- **修正**: `renderEar()` の先頭4行を削除（`ear-choices` 生成ループは維持。`b.setAttribute("aria-label", w.word)` は残す）。
- **受け入れ条件**: ear 入場で prompt「きいて えらぼう」・hint 👂(aria おみみ)・👂ボタン aria「ことばを きく」・絵3択（正解選択可）が不変。`npm test` グリーン。

---

# §D. 要相談（設計判断・コードを触らない）

- **D1. iOS オフラインの無音失敗を録音96個がカバーしない**: `speak()` は ja 音声が解決できると常に Web Speech を使い、録音は「音声合成が無い/ja音声が取れない」時だけ。iOS は Kyoko 等が解決するので、**オフラインで Web Speech が無音失敗しても録音に切り替わらない**＝録音フォールバックが最有力の失敗端末を守れていない。→ 案: `u.onerror` ＋発話開始タイムアウトで `speechSeq` ガード越しに録音再生／`navigator.onLine===false && hasRecordedAudio(text)` のとき録音優先。**要判断**。
- **D2. 報酬限定の副作用（handoff-⑥ §3 継続）**: clap/mirror/teach/ear は `correct`/花丸/フレンドを加算しないが `played` は全モード加算。補助モードばかり遊ぶと保護者画面の「正解」=0・「今週」トレイが0%付近に。指標の母数見直しを要検討。
- **D3. clap が開始時に語を発話＝拍数漏れ（handoff-⑥ §5 継続）**: `MODE_DEFS.clap.speech:"word"`。拍数課題の答えを音で先に与えている。4歳児には足場かもしれず**現状維持が既定**。純粋化するなら mirror 同様 `speech` を中立句に。**要判断**。
- **D4. 純ロジックがテスト不能**: `buildSet`/`loadStore`/`buildChoices`/`validCustomWord` は `export` 無しで、DOM/localStorage に副作用のある `main.js` に閉じ込められ `node --test` で import 不可（`document is not defined`）。→ 副作用のない `src/logic.js` に抽出（state は引数で注入、`Math.random` は注入可能に）し `test/logic.test.js` 追加（no-dup・難易度ランプ・custom 配置・look-alike 除外・移行/日付ロールオーバー/limit 既定）。あわせて `MODE_DEFS` の報酬限定を**網羅アサート**（`Object.keys(MODE_DEFS).filter(m=>MODE_DEFS[m].reward).sort()` が `["cards","trace"]`）＋ never-stuck の Playwright E2E を常設化。handoff-⑥ §7-1 の分割の続き。

---

## 2. 触らない / 確認済み（初回レビュー時点）
- **parity 忠実**: pre-refactor との差分は `setTimeout→after` 置換・インライン表→`MODE_DEFS`/`HOME_MODE_OPTIONS` import・SW/録音の**追加**のみ。`loadQuestion` の表駆動は旧 per-mode 分岐と同値。
- **modes 正確**: 全7モードの areas/slots/listen/redo/prompt/hint/speech/reward が一致、teach は cards-area 共用、cards3 は `cardLevel` 派生、ear の distractor 選択/`earPick` 正しい。
- **timers コア健全**: `timers.js` 正しく、ゲームループに生 `setTimeout` 残存なし、`playTick`(interval)/`traceDemoFrame`(rAF) は個別管理。初回レビュー時点の欠陥は §A1/§B1 の「ガードを after に載せた」点（本周回で修正済み）。
- **XSS なし**: `innerHTML` sink は数値（trail SVG）・固定 SVG（花丸）・`validCustomWord`（`/^[あ-ん]{2,4}$/`＋`KANA_POOL`）で gate された mirror のみ。`new URL(src, baseURI)` の src は manifest 由来＝制御済み。**`validCustomWord` を緩める時は mirror sink を同時に見直す**。
- **初回テスト 7/7 パス**（`timers`/`modes`）。修正後の検証結果は §4 を参照。

## 3. Codex に渡す用（履歴）
> `docs/handoff-fixes-7.md` を読み、**§A1（高・詰み）を最優先で1PR**。前提 HEAD = `main` 先端 `d6482fd`。
> 制約: マルチファイル no-build ESM・バンドラ/SW追加方針は維持・**コード片一致で編集**・**赤バツを出さない**・§0 の既存実装を壊さない。**UIガード/デバウンス（navLock・suppressClick 解除）は `after()` でなく生 `setTimeout`**（§A1/§B1）。
> §B（B1 同根の確定バグ・B2 SW staleness・B3 録音カバレッジ）は §A と同PR可または別PR。**§C は掃除（任意）**。**§D はコードを変えず要相談**。
> 検証: `npm test` ＋ `python -m http.server 8000` で、(A1) 5問目せいかい「つぎへ」→400ms以内「もういちど」→ 新セットの「つぎへ」が前進、(B1) タイル長押し→離して遷移→次問で単タップが効く、(B2) 版を変えず src 変更→1リロードで反映、(B3) ja音声OFFで mirror/誤答/てがきが鳴る、を確認。**§A1 で1PR**。

---

## 4. 実施結果（2026-06-27 / Codex）
- **§A1 修正済み**: `navLock` 解除を `after(400)` から生 `setTimeout` に戻し、`startSet()` / `goHome()` で `navLock=false` を明示リセット。
- **§B1 修正済み**: `suppressClick` 解除を生 `setTimeout` に戻し、`loadQuestion()` / `startSet()` / `goHome()` で持ち越しをリセット。
- **§B2 修正済み**: `sw.js` はコード/JSON/ナビゲーションを stale-while-revalidate、不変アセットを cache-first に変更。
- **§B3 修正済み**: `generate-audio.mjs` が `src/modes.js` の speech と `MSG_WRONG` を収集。てがきの連結発話は「かな単体＋固定句」に分割。録音 manifest は **101件**。
- **§C1〜C3 修正済み**: manifest の maskable 宣言を外し、`startSet()` / `showRest()` に `stopSpeaking()` を追加、`renderEar()` の重複 UI 設定を削除。
- **§D は未実装**: iOS オフライン音声優先・保護者指標・clap 純粋化・純ロジック抽出は設計判断として残す。
- **検証**: `node --check src/main.js` / `node --check sw.js` / `node --check scripts/generate-audio.mjs` OK。`npm.cmd test` は **14/14 パス**（既存7件＋回帰/録音/SW/manifest 7件）。
- **補足**: Codex 側のブラウザ操作接続が途中でタイムアウトしたため、実機ブラウザの A1/B1 操作スモークは未完了。`test/main-regressions.test.js` で該当箇所の再発防止を固定済み。
