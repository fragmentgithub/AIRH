# 修正 引き継ぎ書 ⑥（Codex 向け）

対象ファイル: **`index.html`（プロジェクト唯一の実体）**
作成: 2026-06-27 / レビュー＋検証: Claude Code（`main` 全文精読 → 指摘 → Codex 修正 → ローカル実機スモークで照合）
基準: **`main` 先端 `003f11a` に対する作業ツリー変更（index.html +120/-35、未コミット）**
姉妹: [`handoff-fixes.md`](handoff-fixes.md) / [`-2`](handoff-fixes-2.md) / [`-3`](handoff-fixes-3.md) / [`-4`](handoff-fixes-4.md) / [`-5`](handoff-fixes-5.md) / [`handoff-ideas.md`](handoff-ideas.md)

> **本書は「レビュー → 修正 → 検証」が一巡した記録**。`003f11a` 時点を全体レビューし、新規確定バグ2件・掃除・要相談（handoff-⑤ §D）を洗い出した。Codex が **§A・§B に加えて §C（要相談だったモード設計）も実装**。Claude Code が `python -m http.server 8000` でランタイム検証し、**全工程コンソールエラー0件・「絶対に詰まらない」維持**を確認した。
> handoff-⑤ の §A/§B/§C はすでに `003f11a` に反映済み（[`-5` §1 照合表](handoff-fixes-5.md) 参照）。本書はその次の周回。

---

## 0. 大前提（崩さない）
- `index.html` 1ファイルのみ。外部依存追加なし。Service Worker 追加禁止。静的/オフライン/`file://`。
- 主ユーザー＝字が読めない4歳児。**赤バツ・強い失敗演出なし**。**「絶対に詰まらない」を守る**。
- 既存の検証済み実装を壊さない（🏠幽霊スタンプ防止・誤答プレフィックス保持・フォーカストラップ＋inert・ストレージ移行＋旧キー削除・look-alike 除外・calm/big/lefty・iOS音声 priming・stray tap 無視・てがき24秒自動解放＋ラッチ）。
- リポジトリは **`main` 一本**。作業は `git switch -c <topic> main` から。本番は main push → GitHub Pages（fragmentgithub.github.io/AIRH）。

---

## 1. 適用＆検証結果（この周回で実装済み）

### §A. 新規・確定バグ（Claude Code 指摘 → 修正済み → 検証OK）

| ID | 内容 | 実装 | 検証（スモーク） |
|----|------|------|------------------|
| **A-new1** | 「人を増やす」直後、保護者シートが**前の子の統計を表示し続ける** | `refreshParentStats()` を新設し `openParents()`/`addProfile()` 両方で呼ぶ | シートを開いたまま「＋」→統計が新プロフィールへ即更新（旧:5/5/1分 が残る→修正後:即0）✅ |
| **A-new2** | `speakWordSlow` の遅延発話が**追跡外**で遷移後に鳴り残る | `slowSpeakTimers`＋`clearSlowSpeak()` を追加し `stopSpeaking()`/`speakWordSlow()`/`showSuccess()` でクリア | おみみ即タップでもせいかい画面に個別かなが残らない（コード経路確認）✅ |

### §B. 掃除（実装済み）

| 項目 | 実装 |
|------|------|
| `inputmode="kana"`（無効値） | → `inputmode="text"` ✅ |
| 「＋ 人を増やす」上限時 no-op | `updateProfileAddUi()` で `items>=3` に `disabled`＋`.ghost-btn:disabled` CSS ✅ |
| てがき「おてほん」の死にコード | **本物の運筆デモを復活**：`ghost-dot` を `guidePts` 上で `requestAnimationFrame` 走査。死んでいた `@keyframes ghost-trace` は削除し `transition:opacity` に置換 ✅ |
| `guidePts` 未使用 | 上記デモ＋新 `traceCoverage()` で使用するようになり死にコード解消 ✅ |

### §C. モード設計（handoff-⑤ §D：要相談だった項目 → 方針採用・実装済み）

> **重要**: これらは handoff-④ §6「ホームのモードピッカーは現状維持」と競合する判断だった。**この周回で「直す」方針が採用された**。以後 handoff-④ の「現状維持」より本書が新しい。

| 旧ID | 採用した実装 | 検証 |
|------|------------|------|
| ⑤D1 おみみに課題が無い | **おみみを絵3択に課題化**（`renderEar`/`earPick`）。語を読み上げ→正しい絵を選ぶ。誤答は「よく きいてみよう」で再挑戦 | 3択表示・👂で答え非表示・スロット/リスン非表示・誤答再挑戦 ✅ |
| ⑤D2 全モード同一報酬 | **報酬を cards/trace に限定**（`earnsProgressReward()`）。clap/mirror/teach/ear は花丸・フレンド・`correct` を加算しない | カード→トレイ5、おみみ1セット→トレイ5のまま、てがき1語→6（加算）✅ |
| ⑤D3 7モード既定提示 | **ホーム既定を `['cards']` に縮小**（`defaultStore().homeModes`）。他モードは保護者「トップに表示」でオプトイン | 新規状態でホームに「ふだ」のみ表示 ✅ |
| ⑤D4 mirror の答え漏れ | **mirror はヒントを `↔` に・発話を「どっちかな」に**（絵と単語を出さない）。trace は **`traceCoverage()`＋`TRACE_MIN_COVERAGE=0.08`** で「字の上をなぞった」判定を追加 | mirror で ↔ 表示・単語非露出 ✅／コーナーだけの長い落書きでは「できた」無効のまま、字をなぞると有効 ✅ |

---

## 2. 検証で確認した不変条件（壊れていない）
- **「絶対に詰まらない」維持**: trace のカバレッジ判定を足したが、`startTraceHelp` の **24秒自動解放（`TRACE_AUTO_MS`）は別経路で `traceDoneUnlocked=true`** にするため、カバレッジ0でも詰まない（コーナー落書きでも24秒で押せる）。clap/mirror/teach/ear の正答札は常に存在。
- **コンソール error/warning 0件**: ホーム・cards 5問完走・おみみ1セット・mirror・trace 完成・保護者シート・人を増やす まで通して0。
- **XSS なし**: 追加した `renderEar` の絵文字は `textContent`、`aria-label` は `setAttribute`。mirror の `innerHTML` sink は従来どおり `validCustomWord` 制約下。

---

## 3. 申し送り・要注意（バグではない・方針確認の余地）

- **報酬限定の副作用（要確認）**: `earnsProgressReward()` で clap/mirror/teach/ear は `correct`/`todayStamps`/`friends` を加算しない。一方 `store.played` は全モードで加算され、`recordSetHistory` の `correct` は `setStamps`。よって**補助モードばかり遊ぶと保護者画面の「正解」が0・「今週」トレイが0%付近**になる（実際は正答していても）。意図どおりか確認を。気になるなら「補助モードは別カウンタ／別表示」「played も報酬モードのみ加算」等の選択肢あり。
- **「おてほん」の運筆順**: デモの点は `guidePts`（ラスター走査＝上→下）順で動くため、**正式な書き順ではなく「ここを見て」の合図**。書き順指導が要るなら別途ストロークデータが必要。
- **`traceCoverage()` のコスト**: 1ストロークごとに `getImageData(300×300)`（解放までの間のみ／`willReadFrequently:true`）。実機スモークで体感問題なし。多ストローク高頻度で重い兆候が出たら、サンプル間引き等で軽量化可。

---

## 4. リポジトリ状態
- 変更は **作業ツリーに未コミット**（`index.html` +120/-35）。新規 `docs/handoff-fixes-6.md`（本書）も未追跡。
- ブランチは `main` のみ（旧 `codex/*` は削除済み、PR #1–#3 マージ/クローズ済み）。
- 反映するなら `main` から作業ブランチを切って commit → PR → main（push で GitHub Pages 反映）。

## 5. 次の周回の候補（任意）
- §3「報酬限定の副作用」を踏まえた保護者画面の指標見直し（正解/トレイの母数）。
- clap も `loadQuestion` で `speak(current.word)` のまま＝拍数のヒントに語が聞こえる（課題上は許容だが、純粋化するなら mirror 同様にゲート可）。
- handoff-⑤ §D の残（あれば）と spec（[`hiragana-word-game-spec.md`](hiragana-word-game-spec.md)）の整合再点検。

---

# §6. リファクタリング方針（着手判断）

> **結論: 大改修はしない。的を絞る。** single-file 制約（モジュール分割不可）で整理の上限が低く、自動テストが無い4歳児向けアプリでは“静かな回帰”のリスクが利得を上回る。**やるなら小刻み＋毎回 `python -m http.server 8000` スモーク**。一括書き換え禁止。

## やらない（明示）
- **ファイル分割**: single-file 制約により選択肢外。
- **グローバル状態の全面書き換え**: `queue/qIndex/current/selected/...` は規模相応で可読。動くコードの churn は避ける。
- **CSS 再編**: トークン化＋section コメント済みで困っていない。

## R1（推奨・高リターン低リスク）: タイマー／ライフサイクルの一元化

- **背景（“また出る”バグクラス）**: 直近2件 — handoff-⑤ **A1**（`onWrong` の追跡外 `setTimeout`）・handoff-⑥ **A-new2**（`speakWordSlow` の追跡外 `setTimeout`）— は同一原因＝**どのクリア機構にも登録されていない一発タイマーが画面遷移後に発火**。個別対応のたびに別の未登録タイマーが残る限り再発する。
- **現状のタイマー群（散在）**: `solveTimer`（`scheduleSolve`/`clearSolveTimer`）・`traceTimers[]`（`startTraceHelp`/`clearTraceHelp`）・`slowSpeakTimers[]`（`speakWordSlow`/`clearSlowSpeak`）・`peepTimer`（`setPeepMood`）・`mouthTimer`（`showMouthCue`）・`traceDemoTimer`＋`traceDemoFrame`（`stopTraceDemo`）。インターバルは `playTick`（`start/stopPlayClock`）。
- **提案（登録型ヘルパー＋全掃き）**:
  ```js
  // 一発タイマーは必ずこれ経由にする（生 setTimeout をゲームループで使わない）
  let pendingTimers = new Set();
  function after(ms, fn){
    const id = setTimeout(()=>{ pendingTimers.delete(id); fn(); }, ms);
    pendingTimers.add(id);
    return id;
  }
  function cancelAfter(id){ if(id!=null){ clearTimeout(id); pendingTimers.delete(id); } }
  function cancelAllPending(){ pendingTimers.forEach(clearTimeout); pendingTimers.clear(); }
  ```
  - 既存の「直前を置換」系（peep/mouth/solve）は**個別ハンドルを残したまま `after` 経由**にする（置換挙動は維持しつつ、`cancelAllPending` が取りこぼしを必ず掃く）。
  - **画面遷移の各所で `cancelAllPending()` を呼ぶ**: `goHome` / `startSet` / `switchProfile` / `showRest` / `loadQuestion`。既存の `clearSolveTimer`/`clearTraceHelp`/`clearSlowSpeak`/`stopSpeaking` 呼び出しは、移行が済めば `cancelAllPending()` 1本に集約できる（段階的に）。
- **移行手順（小刻み・各ステップでスモーク）**:
  1. `after`/`cancelAllPending` を追加（まだ誰も使わない＝挙動不変）。
  2. ゲームループ内の生 `setTimeout` を1機能ずつ `after` に置換（`scheduleSolve`／`startTraceHelp`／`speakWordSlow`／`setPeepMood`／`showMouthCue`／`stopTraceDemo`／`showSuccess` 内の `speak` 遅延／`nextQuestion` の `navLock` 解除 など）。1機能直すごとに当該モードをスモーク。
  3. 遷移関数に `cancelAllPending()` を入れる。
  4. 最後に重複クリア（個別 `clear*`）を整理。
- **`after` に入れないでよい例外（startup/非ゲームループ）**: `pickVoiceRetry`（起動時の音声解決）・`onvoiceschanged`・`speak()` 内の `setTimeout(fire,60)`（`speechSeq` ガード済み）。`playTick`（setInterval）と `traceDemoFrame`（rAF）は性質が違うので**従来どおり個別管理**（rAF も掃きたいなら `cancelAllPending` に `cancelAnimationFrame` 分を足す）。
- **受け入れ条件**:
  - 遅延発生→即遷移の回帰テストが全て無害: (a) カード誤答→620ms以内に🏠→はじめる→数文字タップで**入力が消えない**、(b) おみみ/拍手で読み上げ中に🏠→**せいかい/次問に鳴り残らない**、(c) てがき解放待ち中に🏠→**ゴーストや解放が残らない**。
  - 既存スモーク（cards5問・おみみ・mirror・trace完成・保護者シート・人を増やす）で**コンソール0件・「絶対に詰まらない」維持**。
  - `index.html` でゲームループ内の生 `setTimeout(` が（上記例外を除き）無くなる。

## R2（任意・中リスク）: モード記述テーブル化

- **現状**: モード挙動が散在 — `loadQuestion` の per-mode 表示切替（各 `*-area`/`slots`/`listen-btn`/`redo-btn` の hidden）・per-mode の `prompt-text`/ヒント上書き・`render*` ディスパッチ・`earnsProgressReward()`・答え漏れゲート。モード追加は複数箇所の同時編集が必要。
- **提案**: モードごとに1エントリの記述子へ集約。
  ```js
  // 例（キーは現行の store.mode / cards3 は cardLevel で派生）
  const MODE_DEFS = {
    cards:  { area:"cards-area", slots:true,  listen:true,  redo:true,  reward:true,  prompt:"これ な〜に？", render:renderChoices },
    trace:  { area:"trace-area", slots:true,  listen:true,  redo:false, reward:true,  prompt:"これ な〜に？", render:()=>setupTraceChar(false) },
    clap:   { area:"clap-area",  slots:false, listen:false, redo:false, reward:false, prompt:"なんかい たたく？", render:renderClap },
    mirror: { area:"mirror-area",slots:false, listen:false, redo:false, reward:false, prompt:"ただしいの どっち？", hidePicture:"↔", say:"どっちかな", render:renderMirror },
    teach:  { area:"cards-area", slots:true,  listen:true,  redo:false, reward:false, prompt:"ひよこに おしえて", render:renderTeach },
    ear:    { area:"ear-area",   slots:false, listen:false, redo:false, reward:false, hidePicture:"👂", slow:true, render:renderEar },
  };
  ```
  `loadQuestion` は定義を引いて hidden/prompt/発話/描画を回し、`earnsProgressReward` は `MODE_DEFS[store.mode].reward` を見るだけにする。
- **注意**: core ループに触るので、**R1 完了後**に着手。挙動は厳密に等価を保つ（特に teach は cards-area 共用・cards3 は `cardLevel===3` 派生）。
- **受け入れ条件**: 全7モードの表示/発話/報酬/ゲートが現行と**ピクセル/挙動同値**で、モード追加が1エントリで済む形になる。

## 進め方（共通）
- テスト無し前提で **1論点=1コミット**、各コミットで該当モードをスモーク。R1→（必要なら）R2 の順。`main` から `git switch -c refactor-timers main`。
