# 修正 引き継ぎ書 ④（Codex 向け）

対象ファイル: **`index.html`（プロジェクト唯一の実体）**
作成: 2026-06-26 / レビュー: Claude Code（現行 `e64a21f` を多角レビュー＋実機相当スモークで照合済み）
前提: **HEAD = `e64a21f`「Make trace mode worksheet-style practice」**（本番反映済み）。
姉妹: [`handoff-fixes.md`](handoff-fixes.md) / [`-2`](handoff-fixes-2.md) / [`-3`](handoff-fixes-3.md) / [`handoff-ideas.md`](handoff-ideas.md)

> `e64a21f` のレビュー結果、報告されたiPhone2バグ（てがき自動進行・iOS音声）は概ね解消・確定ブロッカー無し。本書は残った**「4歳児がつまずく/混乱する」回避**の小修正。**ホームのモードピッカーは現状維持の方針**（残す）なので、撤去でなく仕上げ(H1-H3)のみ。**行番号でなくコード片一致（Edit）**で適用。

---

## 0. 大前提（崩さない）
- `index.html` 1ファイルのみ。外部依存追加なし。Service Worker 追加禁止。静的/オフライン/`file://`。
- 主ユーザー=字が読めない4歳児。赤バツ・強い失敗演出なし。**「絶対に詰まらない」を守る**。
- 既存の検証済み実装（🏠の幽霊スタンプ防止・誤答プレフィックス・保護者フォーカストラップ＋inert・played≠correct・F-1・ストレージ移行・look-alike除外・calm/big/lefty・iOS音声・stray tap無視・タイル中央寄せ）を壊さない。

## 1. 一覧
| ID | 優先 | 内容 |
|----|------|------|
| T1 | **高** | てがきで字から外れて描くと「できた」が永久に出ず**詰む**（唯一「絶対に詰まらない」が破れる経路）|
| T2 | 中 | 描きすぎ（`ink>guideArea×1.95`）で**一度出た「できた」が消える** |
| H1 | 中 | ホームのモード選択が**無音**（他の子タップは全部鳴る）|
| H2 | 低 | teach のアイコン `🐥` が**マスコットと重複** |
| H3 | 低 | `てびょうし`（5文字 nowrap）が ~360px 幅で**溢れる**懸念 |

T1とT2は同じ仕組み（`traceDoneUnlocked` ラッチ）で一緒に直すのが綺麗。

---

## 2. T1 + T2. てがきの「詰み」回避＋「できた」ラッチ（高/中）

- **現状（`checkTrace` 1835-1878）**: `ready = enoughStrokes && enoughLength && touchedGuide && notTooMuch` を毎 `padUp` で再計算し `updateTraceDoneUi(ready)`。
  - **T2**: `notTooMuch = ink <= guideArea*1.95` のため、一度 ready でも描き足すと ready=false に戻り「できた」が消える。
  - **T1**: `touchedGuide = coverage>=0.34 && precision>=0.34`。字から外れて描き続けると ready が永久に false。`startTraceHelp`（1682-1704）の 8/16/24秒エスカレーションと `noteTraceAttempt`（1711-1728, けす由来）の5回到達は**お手本を見せるだけで閾値を緩めず「できた」も出さない**＝詰む。カードモードは relax で自動進行するのに、てがきだけ救済が無い。
- **修正方針**: **char 単位の `traceDoneUnlocked` ラッチ**を導入。①一度 ready になったらラッチ（T2解消：描き足しても消えない）。②救済ティア（けす5回 or 24秒）で**「できた」を無条件解放**（T1解消：必ず先へ進める）。
- **コード**:
  ```js
  // 状態追加（let totalTraceLen = 0; の直後, 約1116行）
  let traceDoneUnlocked = false;
  ```
  ```js
  // setupTraceChar(): リセット行（約1732 "traceAttempts = 0; committedStrokes = 0; totalTraceLen = 0;"）に追記
  traceAttempts = 0; committedStrokes = 0; totalTraceLen = 0; traceDoneUnlocked = false;
  ```
  ```js
  // checkTrace(): 1866-1878 の「const ready=…; updateTraceDoneUi(ready); if(ready){…}…」を置換
  const ready = enoughStrokes && enoughLength && touchedGuide && notTooMuch;
  if(ready) traceDoneUnlocked = true;          // ラッチ：描き足しで「できた」を消さない(T2)
  updateTraceDoneUi(traceDoneUnlocked);
  if(traceDoneUnlocked){
    $("message").textContent = "できたら おしてね";
  } else if(!enoughStrokes){
    $("message").textContent = "つぎの せん かこう";
  } else if(!touchedGuide){
    $("message").textContent = "きいろの じを なぞろう";
  } else if(!notTooMuch){
    $("message").textContent = "ゆっくり なぞろう";
  } else {
    $("message").textContent = "もうすこし なぞってね";
  }
  ```
  ```js
  // noteTraceAttempt(): AUTO ティア（約1716 "if(traceAttempts >= TRACE_AUTO_ATTEMPTS){ … }"）を置換
  if(traceAttempts >= TRACE_AUTO_ATTEMPTS){
    traceDoneUnlocked = true; updateTraceDoneUi(true);   // 詰み回避：けす連打で「できた」解放(T1)
    $("message").textContent = "できたら おしてね";
    speak("できたら おしてね", 0.85);
    playTraceDemo(true);
    return;
  }
  ```
  ```js
  // startTraceHelp(): TRACE_AUTO_MS タイマー（約1697-1702）に2行追記
  setTimeout(()=>{
    if(!stillThisTraceChar(ch)) return;
    traceDoneUnlocked = true; updateTraceDoneUi(true);   // 詰み回避：~24秒で「できた」解放(T1)
    $("message").textContent = "できたら おしてね";
    speak("いっしょに かこう", 0.85);
    playTraceDemo(true);
  }, TRACE_AUTO_MS),
  ```
- **トレードオフ（メモ）**: 救済解放後は空のパッドでも「できた」を押せる＝実質スキップ。これはカードモードの relax 自動進行と同性質で「絶対に詰まらない」を優先した結果。**けす連打で毎回スキップ**できてしまうのが気になるなら `TRACE_AUTO_ATTEMPTS`（現5）を増やす。
- **受け入れ条件**:
  1. 字を一度なぞって「できた」が出たら、その後**描き足しても「できた」は消えない**。
  2. 字から外れて描き続けても、**けす5回 or 約24秒**で「できた」が押せるようになり、**必ず次へ進める**（赤バツ無し）。
  3. 通常のなぞり→「できた」→次、の流れは不変。新しい字で `traceDoneUnlocked` はリセット。

---

## 3. H1. ホームのモード選択に音フィードバック（中）

- **場所**: `chooseHomeMode()`（2314-2321）。他の子タップ（tapLetter/clapTap/mirrorPick/removeAt/acceptTraceChar）は全て `blip(...)` で鳴るが、ここだけ無音＝**読めない子が無自覚に切替**しても気づけない。
- **修正**:
  ```js
  function chooseHomeMode(key){
    const opt = HOME_MODE_OPTIONS[key];
    if(!opt) return;
    store.mode = opt.mode;
    store.cardLevel = opt.cardLevel || 0;
    saveStore();
    applyModeUi();
    blip("tap");          // 選択を音で確認（誤タップに気づける）
  }
  ```
- **受け入れ条件**: ホームのモードボタンを押すと「ポッ」と鳴り、選択状態の見た目も変わる。

## 4. H2. teach アイコンの重複解消（低）

- **場所**: 657 行 `data-home-mode="teach"` のアイコン `🐥`（ホームのマスコット 🐥 と同一）。
- **修正**: 別の単一コードポイント絵文字へ（異体字セレクタ付きは描画揺れがあるので避ける）。推奨 `💬`（話す＝おしえる）:
  ```html
  <span class="home-mode__icon" aria-hidden="true">💬</span><span class="home-mode__label">おしえる</span>
  ```
  （他案: 🙋 / 📣 / 🎓。他モードのアイコン 🃏🔤✏️👏↔👂 と被らないものなら可。）
- **受け入れ条件**: ホーム上で teach アイコンがマスコットや他モードと視覚的に区別できる。

## 5. H3. `てびょうし` ラベルの溢れ対策（低）

- **場所**: 651 行 `てびょうし`（5文字）。`.home-mode__label{white-space:nowrap}`（209）＋ 4列グリッドで ~360px 幅だと溢れ/見切れの懸念。
- **修正（どちらか）**:
  - **A（推奨・短縮）**: ラベルを `たたく` に（保護者シートの拍手モード表記とも揃う・3文字で確実に収まる）。
    ```html
    <span class="home-mode__icon" aria-hidden="true">👏</span><span class="home-mode__label">たたく</span>
    ```
  - **B（CSSで縮小許可）**: `.home-mode__label` の `white-space:nowrap` を外す、または `font-size:clamp(10px,2.8vw,14px)` 等に下げる。
- **受け入れ条件**: 360px 幅（実機 iPhone SE 級）で全ラベルがセル内に収まる（溢れ・見切れ無し）。

---

## 6. 触らない / 任意の判断
- **`strokesNeededFor` は「お手本の線の本数」を数える**ため、あ・お・き・す・し・く 等は**1ストロークで完成**（stray tap ではなく実際になぞる必要はある）。ワークシート簡略化として現状維持で問題なし。特定の字を「2画必須」にしたい場合のみ、その字のお手本パターンを複数配列にする or `strokesNeededFor` に下限指定（別途相談）。
- ホームのモードピッカー自体は**現状維持（残す）方針**。撤去・アイコンのみ化はしない。

## 7. Codex に渡す用（コピペ可）
> `docs/handoff-fixes-4.md` を読み、**T1+T2 → H1 → H2 → H3** を実装してください（前提 HEAD `e64a21f`）。
> 制約: `index.html` 1ファイルのみ・外部依存/SW追加なし・行番号でなくコード片一致で編集。§0 の既存実装（🏠幽霊スタンプ防止・誤答プレフィックス・フォーカストラップ・played≠correct・F-1・ストレージ移行・look-alike除外・iOS音声・stray tap無視・タイル中央寄せ）を壊さないこと。**赤バツを出さない**。
> 特に T1+T2 は `traceDoneUnlocked` ラッチを `checkTrace`/`noteTraceAttempt`/`startTraceHelp`/`setupTraceChar` に一貫して入れ、(a) 一度出た「できた」が描き足しで消えない (b) けす5回 or 約24秒で必ず「できた」が押せる、の2点を満たすこと。
> `python -m http.server 8000` で起動し、てがきで「なぞって出た『できた』が描き足しで消えない／字から外し続けても約24秒で押せる／通常フローは不変」、ホームでモード選択が鳴る、`てびょうし`/teachアイコンの表示、を確認。**この1タスクで1コミット/1PR**。
