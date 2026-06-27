# 修正 引き継ぎ書 ②（Codex 向け）

対象ファイル: **`index.html`（プロジェクト唯一の実体）**
作成: 2026-06-24 / レビュー: Claude Code（現行コードに照合し各指摘を裏取り済み）
前提コミット: `c023a76`「Implement handoff now fixes」+ `70c48bf`「Fix handwriting rescue timing」**適用済みの状態**が前提。
姉妹文書: [`handoff-fixes.md`](handoff-fixes.md)（now グループは検証済・完了）/ [`handoff-ideas.md`](handoff-ideas.md)（拡張バックログ）。

> 本書は「次の修正ウェーブ」= **P2-4 / P2-5 / P3-1 / P3-2** をスコープにした1タスク（=1 PR 想定）。各項目の行番号・コードは**現行 `index.html`（上記2コミット適用後）に照合済み**。ただし下記のとおり編集で行はズレるので、**行番号でなくコード片を一致させて（Edit で）**適用すること。

---

## 0. 大前提（崩さない制約）

- 変更は **`index.html` 1ファイルのみ**（ビルド/外部JS・CSS追加禁止、Google Fonts `<link>` のみ例外）。インライン `<style>`/`<script>`。
- 静的ホスティング・オフライン・`file://` で動く。**Service Worker は追加しない**（＝2ファイル目になり単一ファイル制約に反する）。
- 主ユーザー = 字が読めない4歳児。赤バツ等の強い失敗演出は出さない。
- これら4件はいずれも小規模（a11y・保護者表示・PWA メタ）。`speak()`/`speechSeq`/`primeSpeech` と てがきの段階ヘルプタイマーには**いずれも触れない**（ただし JS 編集は `loadQuestion` の `setTimeout(speak,...)` の近くなので壊さないよう注意）。

## 1. 推奨着手順（行ズレ対策のため、この順で）

1. **P3-2 standalone メタ**（`<head>` 追記のみ・実行時リスク0・最上部なので後続の行ズレの影響を受けない）
2. **P2-4 `.ghost-btn` タップ領域**（CSS のみ・独立）
3. **P3-1 played/correct 分離**（JS小・`loadQuestion`/`onCorrect`）
4. **P2-5 保護者モーダルのフォーカス管理**（JS最大・`openParents`/`closeParents` 置換。**最後**に。他は依存しないが、これが一番下流の行を動かすので最後が安全）

**全体注意**: P3-1 は `loadQuestion`（〜793行）に1行挿入＋`onCorrect`(1008) を編集、P2-5 は `openParents/closeParents`(1091–1101) を長いブロックに置換する。**行番号は必ずズレる**ので Edit でコード片一致。4件とも `speak`/`primeSpeech`/トレースのヘルプタイマーは未変更。

---

## 2. P3-2. standalone メタ（「全画面アプリ」を謳う割に無い）

- **現状確認（検証済）**: `<head>`（3–13行）は charset(4)/viewport(5, `viewport-fit=cover`)/theme-color(6, `#FFFBF2`)/title(7)/SVG絵文字favicon(8,🐥)/preconnect(11–12)/Google Fonts(13) のみ。`apple-mobile-web-app*`/`mobile-web-app-capable`/`manifest`/`apple-touch-icon` は**いずれも無し**（grep 0件）。
- **場所**: `<head>` の **favicon(8行) の直後** に挿入。**theme-color(6行) は既存なので重複追加しない。**
- **問題**: 全画面・大ボタン・🏠ボタンの没入UIなのに standalone メタが無く、「ホーム画面に追加」してもブラウザ chrome（URLバー・戻る）付きで起動。読めない4歳児には誤離脱ハザード＋絵本感を損なう。
- **修正（`<head>` の8行直後に挿入）**:
  ```html
  <!-- standalone web-app hints (home-screen launch without browser chrome) -->
  <!-- "offline" here = browser HTTP cache + system maru-gothic font fallback only.
       A true offline PWA needs a service worker = a second file = breaks the
       single-file constraint, so NO service worker is added. -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="ひらがな" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="application-name" content="ひらがな" />
  <!-- apple-touch-icon intentionally omitted: iOS requires a PNG (SVG/emoji
       data-URI not honored). To add one later, inline a base64 PNG:
       <link rel="apple-touch-icon" href="data:image/png;base64,XXXX" />.
       Until then iOS auto-snapshots the page for the home-screen icon. -->
  <!-- Optional: inline manifest for Chromium install (display:standalone). Remove this line if undesired. -->
  <link rel="manifest" href="data:application/manifest+json,%7B%22name%22%3A%22%E3%81%B2%E3%82%89%E3%81%8C%E3%81%AA%20%E3%81%93%E3%81%A8%E3%81%B0%E3%81%82%E3%81%9D%E3%81%B3%22%2C%22short_name%22%3A%22%E3%81%B2%E3%82%89%E3%81%8C%E3%81%AA%22%2C%22lang%22%3A%22ja%22%2C%22start_url%22%3A%22.%22%2C%22display%22%3A%22standalone%22%2C%22orientation%22%3A%22portrait%22%2C%22background_color%22%3A%22%23FFFBF2%22%2C%22theme_color%22%3A%22%23FFFBF2%22%7D" />
  ```
- **単一ファイル注意**: **Service Worker 禁止**（2ファイル目になる）。「オフライン」は「読込済みページのHTTPキャッシュ＋フォント fallback（`--font-display/--font-ui` の丸ゴ stack, 36–37行）」の意味と割り切る。`apple-touch-icon` は PNG 必須で現 SVG絵文字 favicon は流用不可 → 省略（iOS はページを自動スクショ）。manifest は percent-encoded data-URI で1ファイル維持（Safari は data-URI manifest を無視するが iOS は apple-* メタで standalone 化するので問題なし）。
- **受け入れ条件**: theme-color は1つのまま / `apple-mobile-web-app-capable` と `mobile-web-app-capable` が grep ヒット / 外部ファイル参照を増やさない / iOS「ホーム画面に追加」→ URLバー無しで起動 / Android Chrome の Application>Manifest が `name:ひらがな, display:standalone, theme #FFFBF2` でエラー無し / ゲーム挙動・コンソールエラー不変。
- **相互作用**: standalone だと iOS の戻るが消えるので、**topbar の 🏠`#quit-btn`・🔇`#mute-btn` が唯一の離脱導線**として重要度UP（それらが notch 下に潜らないかは別途 safe-area タスク）。実行時 JS は不変。

## 3. P2-4. テキストボタンのタップ領域が小さい

- **現状確認（検証済）**: `.ghost-btn`（114–119行）は `min-height`/`padding`/`display` 無しで、ヒット領域が文字グリフ＝~18–22px。対象は `#redo-btn`(430,`ghost-btn redo`)/`#clear-btn`(440,`ghost-btn redo`)/`#parent-link`(406,`ghost-btn home__parent`)。
- **場所**: `.ghost-btn{...}`（114–119行）。関連: `.redo`(259, `align-self:center`)、`.home__parent`(155, `position:absolute;left:50%;transform:translateX(-50%);bottom:6px`)。
- **問題**: 透明・枠なしテキストのみでタップ領域が小さく、4歳児が押しにくい（§7「押しやすく」）。見た目（フラットなテキスト）は保ったまま指サイズの当たり判定を確保したい。
- **修正（`.ghost-btn` を置換）**:
  ```css
  .ghost-btn{
    font-family:var(--font-ui);
    font-weight:700;
    border:none;background:transparent;cursor:pointer;
    color:var(--ink-soft);
    display:inline-flex;align-items:center;justify-content:center;
    min-height:44px;padding:8px 16px;
  }
  ```
  `inline-flex`（block/100%幅でない）を使うのが肝：`.home__parent` の絶対配置＋`translateX(-50%)` 中央寄せと `.redo` の `align-self:center` を壊さない。font-size/color/weight/background は不変。
- **受け入れ条件**: 3ボタンとも高さ≥44px / 見た目不変（透明・枠なし・同色・同 font） / `#parent-link` がホーム下部で水平中央のまま / `#redo-btn`/`#clear-btn` が中央のまま・手書き操作列がズレない / focus-visible(120) が拡大ボックスに正しく出る。
- **単一ファイル注意**: 既存 `<style>` 内の CSS のみ。`#sheet-close` は `.btn sheet__close`（`.ghost-btn` ではない）ので**影響しない**。
- **相互作用**: `#parent-link` の 44px は `bottom:6px` から上に伸びる → 極端に低いホーム画面で `はじめる`(404) と近接しないか目視確認（ブロッカーではない）。topbar の `.icon-btn`(quit/mute) は別クラスで無関係。

## 4. P3-1. 保護者シートの played と correct が常に同値

- **現状確認（検証済）**: `onCorrect`(1007–1013) の **1008行が `store.played++; store.correct++;`**（両方を正解時のみ加算）。`loadQuestion`(791–805) は `played` を触らない。`onWrong`(990–1006) も触らない。→ `stat-played === stat-correct` が常に成立（保護者は「全問正解」と誤解）。重要度は**低**（保護者シートのみ・子の体験に無影響）。
- **場所**: `onCorrect` 1008行 / `loadQuestion` の状態リセット行（793: `selected = []; wrongCount=0; ...`）の直後に挿入。call site は `startSet`(1068) と `nextQuestion`(1034–1036) のみ。表示は 1092–1093。
- **問題**: `played`（到達した問題数）と `correct`（正解数）が別物として機能していない。
- **修正**:
  ```js
  /* loadQuestion(): 状態リセット行(793) の直後に2行追加
     （到達した問題を1回だけ計上＋🏠中断でも記録されるよう保存） */
    store.played++; saveStore();

  /* onCorrect(): 1008行を
       store.played++; store.correct++;
     →（played は loadQuestion で数えるので外す） */
    store.correct++;
  ```
  - **二重計上ガード**: `onWrong`(990–1006) は `loadQuestion` を呼ばない（その場で slot 再描画）ので、リトライで `played` は増えない（検証済）。`played++` は `loadQuestion` の call site（startSet/nextQuestion）でのみ＝1問1回。
  - **1009行の `store.todayStamps++; setStamps++;` と 1010行の `saveStore()` はそのまま残す**（1008の played 部分だけ削除）。
- **受け入れ条件**: 誤答してから正解する回があると、セット通算で `played > correct` になりうる / 1問を N回間違えて正解 → played は+1（N+1でない）, correct +1 / 🏠 で問題途中に離脱しても、その問題は played に計上（`loadQuestion` の `saveStore` で永続） / 日付替わりで played/correct はリセットされない（loadStore は date 変化時 todayStamps のみ0化）。
- **単一ファイル注意**: JS のみ。loadStore は played/correct を 0 既定（566–567 付近）なので既存ユーザーも安全。修正前の `played===correct` の既存値はそのまま残り、以降から乖離（保護者診断として許容）。
- **相互作用**: 🏠 `goHome`(1070+) は `loadQuestion` を呼ばない＝幻の played を増やさない。`showEnd`(1046) も再 load しない。`saveStore` 追加で localStorage 書込が僅増（無視可）。

## 5. P2-5. 保護者モーダルのフォーカス管理が無い（WCAG 2.4.3 / 4.1.2）

- **現状確認（検証済）**: `openParents`(1091–1097) は stats 設定＋`.is-open`＋`aria-hidden=false` のみで**ダイアログにフォーカスを移さない**。`closeParents`(1098–1101) は `.is-open` 除去＋`aria-hidden=true` のみで**フォーカスを戻さない**。Tab トラップ無し。markup 475–493（`#sound-toggle`481 は `<button>`, `#sheet-close`491 は `.btn sheet__close`）。
- **問題**: 開いても背後にフォーカスが残り、Tab が背景（はじめる等）へ抜ける。閉じてもフォーカスが body に落ち `#parent-link` に戻らない。aria-modal なのに実際はフォーカスを拘束していない。
- **方針（ネイティブ `<dialog>` は採らない）**: 既存 veil が背景を兼ね、veil クリック閉じ(1118)が `e.target===#parent-veil` に依存（`<dialog>` の `::backdrop` は event target にならず壊れる）し、`showModal()` が CSS(351–358) の中央寄せ/backdrop と競合するため。**現マークアップ維持で手動フォーカス管理**が最小・低リスク。
- **修正（`openParents`/`closeParents`(1091–1101) を置換。リスナー 1117–1119 はそのまま）**:
  ```js
  let parentTrap = null;        // bound keydown handler while sheet is open
  let parentReturnFocus = null; // element to restore focus to on close

  function openParents(){
    $("stat-played").textContent = store.played;
    $("stat-correct").textContent = store.correct;
    applyMuteUi();
    parentReturnFocus = (document.activeElement instanceof HTMLElement)
      ? document.activeElement : $("parent-link");
    $("parent-veil").classList.add("is-open");
    $("parent-veil").setAttribute("aria-hidden","false");
    $("sheet-close").focus();
    parentTrap = (e)=>{
      if(e.key!=="Tab") return;
      const nodes = $("parent-veil").querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.prototype.filter.call(nodes, el =>
        !el.disabled && el.offsetParent !== null);
      if(!list.length){ e.preventDefault(); return; }
      const first = list[0], last = list[list.length-1];
      if(e.shiftKey && document.activeElement === first){
        e.preventDefault(); last.focus();
      } else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", parentTrap, true);
  }

  function closeParents(){
    if(!$("parent-veil").classList.contains("is-open")) return; // idempotent (Escape may fire when already closed)
    $("parent-veil").classList.remove("is-open");
    $("parent-veil").setAttribute("aria-hidden","true");
    if(parentTrap){ document.removeEventListener("keydown", parentTrap, true); parentTrap = null; }
    const target = parentReturnFocus || $("parent-link");
    parentReturnFocus = null;
    if(target && typeof target.focus === "function") target.focus();
  }
  // 1117(sheet-close click) / 1118(veil click-to-close) / 1119(global Escape) は UNCHANGED。
  ```
  既存の Escape ハンドラ(1119)は**そのまま**（`closeParents` が冪等ガードを持つので二重 close しない。トラップ内に Escape 分岐を**足さない**こと）。
- **受け入れ条件**: `#parent-link` で開くと `#sheet-close` にフォーカス（focus ring 表示）/ Tab/Shift+Tab が `#sound-toggle`↔`#sheet-close` の2つだけを循環し背景に出ない / Escape で閉じ＆`#parent-link` にフォーカス復帰・閉状態で投げない / veil クリックで閉じ＆復帰 / `#sheet-close` クリックで閉じ＆復帰＆トラップ解除 / SR がダイアログを読み上げフォーカスが内側。
- **単一ファイル注意**: インライン JS のみ。`<dialog>.showModal()` は採用しない（veil クリック閉じが壊れ、CSS と競合するため）。可視判定 `el.offsetParent!==null` はシートが `position:fixed` でないので有効。
- **相互作用**: トラップは `$("parent-veil")` 配下に**スコープ**されるので背景の `#start-btn`/`.mode-opt` は元々候補に入らない。capture-phase(第3引数 true) の Tab トラップは bubble の Escape(1119) と衝突しない。`#quit-btn` は別画面（プレイ画面）なので同時に tab order に並ばない。`speak/primeSpeech`・トレースタイマーとは無関係。

---

## 6. 相互作用・横断メモ（レビュー要約）

- **行ズレ連鎖**: P3-1 が `loadQuestion`(~793) に1行挿入＋`onCorrect`(1008) 編集、P2-5 が `openParents/closeParents`(1091–1101) を長文に置換。**raw 行番号で後続を当てない**。Edit でコード片一致＋**推奨順（P3-2→P2-4→P3-1→P2-5）**で適用。P3-2(head)/P2-4(114) はドリフトより上なので先に。
- **P2-4 ↔ P2-5**: `#parent-link` は `.ghost-btn` なので P2-5 の復帰フォーカス時に拡大した focus ring が出る（意図どおり）。`#sheet-close` は `.btn` で P2-4 の影響外（ダイアログ内 focus ring は `.btn:focus-visible`(112) のまま）。
- **P3-1 二重計上**: `loadQuestion` の call site は `startSet`(1068)/`nextQuestion`(1036) のみ。`onWrong` は loadQuestion を呼ばないのでリトライで増えない（検証済）。
- **P3-2 ↔ 離脱導線**: standalone で戻るが消える分、`#quit-btn`/`#mute-btn` の重要度UP（safe-area は別タスク）。
- 4件とも `speak()`/`speechSeq`/`primeSpeech` と てがき段階ヘルプタイマーは**未変更**。ただし JS 編集箇所は `loadQuestion` の `setTimeout(speak,...)`(~804) の近くなので、その行を壊さないこと。

---

## 7. Codex に渡す用（コピペ可）

> リポジトリの `docs/handoff-fixes-2.md` を読み、**P3-2 / P2-4 / P3-1 / P2-5** を §1 の推奨順（P3-2→P2-4→P3-1→P2-5）で実装してください。前提は既適用コミット `c023a76`＋`70c48bf`。
> 制約: 変更は `index.html` 1ファイルのみ。**Service Worker は追加しない**。`speak()`/`primeSpeech`/トレースのヘルプタイマーには触れない。行番号でなく**コード片を一致**させて編集（P3-1/P2-5 で下流行がズレるため）。
> 各項目の「受け入れ条件」を満たすこと。特に P3-1 は `onCorrect` の `todayStamps/setStamps/saveStore` を残し played だけ外す、P2-5 は既存の Escape/veil-close リスナーを変更しない。
> `python -m http.server 8000` で起動し、キーボードのみで保護者シート開閉（Tab循環・Escape復帰）、保護者シートの played/correct が乖離しうること、ボタンのタップ領域、を確認。**この1タスクで1コミット/1PR**。
