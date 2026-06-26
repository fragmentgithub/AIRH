# 修正 引き継ぎ書 ③（Codex 向け）

対象ファイル: **`index.html`（プロジェクト唯一の実体）**
作成: 2026-06-25 / レビュー: Claude Code（14エージェントの多角レビュー＋敵対的検証＋実機スモーク。各指摘は現行コードに照合済み）
前提コミット: `610ab6f`「Implement remaining handoff ideas」＋ `06b227d`「Add parent playtime limit」**適用済み**が前提。
姉妹: [`handoff-fixes.md`](handoff-fixes.md) / [`handoff-fixes-2.md`](handoff-fixes-2.md)（いずれも完了・検証済）/ [`handoff-ideas.md`](handoff-ideas.md)（バックログ）。

> `610ab6f`（+676行・新モード/プロフィール/自作単語等）のレビューで判明した **確定バグ3件（B）＋直したい5件（S）**。ストレージ移行・既存修正6件・単一ファイル制約は無傷であることも確認済み（本書末尾「回帰OK」）。**行番号は編集でズレるのでコード片一致（Edit）**で適用。

---

## 0. 大前提（崩さない）

- `index.html` 1ファイルのみ。ビルド/外部依存追加なし（Google Fonts `<link>` のみ例外）。静的・オフライン・`file://`。**Service Worker 追加禁止**。
- 主ユーザー = 字が読めない4歳児。赤バツ・強い失敗演出なし。子の経路に読めない選択を置かない。
- カリキュラム: 濁点/半濁点/小書きなし、2-3文字、look-alike（ね/れ/わ・は/ほ/ま・さ/き/ち・ぬ/め/ね・る/ろ・つ/う）を答えの隣に並べない。
- **崩してはいけない既存実装**: 🏠離脱・誤答プレフィックス保持・てがき時間ベース救済＋全塗りガード・保護者シートのフォーカストラップ・played≠correct・F-1タイマー・ストレージ移行(p1フォールバック)。

## 1. 推奨着手順

**B1 → B2 → B3 → S1 → S3 → S4**（Bが確定バグ、最優先）。S2 は設計判断（コードでなく方針）。

| ID | 重大度 | 内容 |
|----|--------|------|
| B1 | 高 | 離脱レース：完成アクション後の `setTimeout` を `goHome` がクリアせず、🏠押下後に幽霊スタンプ＋success遷移（**全モード・実機再現済み**）|
| B2 | 高 | teach モードで ↺やりなおし が生きて状態破壊→壊れた語でスタンプ |
| B3 | 高 | `buildChoices`（自作単語用）が look-alike を無作為混入 |
| S1 | 中 | おてほん運筆デモが しずか/reduced-motion を無視 |
| S2 | 中 | teach/mirror/ear が4歳に不適（設計判断）|
| S3 | 中 | clap-reset/next-btn 再入ガードなし＋clap叩きすぎで全リセット |
| S4 | 低 | 自作単語フィードバックが無関係箇所＋aria-live無し／死にコード |

---

## 2. B1. 離脱レースで幽霊スタンプ（高・実機再現済み）

- **症状（実機確認）**: ear モードで 👂 をタップ→260ms 以内に 🏠 を押すと、ホームに戻った後で `onCorrect` が発火し、**success画面へ飛び＋`todayStamps` が加算**（0→1）。全モードで同型。
- **原因**: 各モードの「完成→正解」は裸の `setTimeout` 経由で `goHome()` がこれをクリアせず、`onCorrect`/`showSuccess` も画面状態を見ない。`goHome()`（1707）は `locked/drawing/traceBusy` をリセットするが `clearTimeout` は無い。
- **対象 setTimeout（6か所）**:
  - `tapLetter` 1545 `setTimeout(judge, 480)`
  - `acceptTraceChar` 1525 `setTimeout(()=>{… onCorrect() …}, 650)`
  - `clapTap` 1206 `setTimeout(onCorrect, …)`
  - `mirrorPick` 1230 `setTimeout(onCorrect, 520)`
  - `teachPick` 1264 `setTimeout(onCorrect, 620)`
  - `ear-btn` ハンドラ 1870 `setTimeout(onCorrect, 260)`
- **修正**:
  ```js
  // 実行時状態の近くに:
  let solveTimer = null;

  // 上記6か所すべてを「solveTimer = setTimeout(...)」に置き換える。例:
  //   solveTimer = setTimeout(judge, 480);
  //   solveTimer = setTimeout(()=>{ if(selected.length===current.word.length) onCorrect(); else setupTraceChar(true); }, 650);
  //   solveTimer = setTimeout(onCorrect, 260); …等

  // goHome() 冒頭に追加（showRest/switchProfile にも入れておくと安全）:
  if(solveTimer){ clearTimeout(solveTimer); solveTimer = null; }

  // onCorrect() 冒頭にガード（ベルト＆サスペンダー）:
  if(!screens.quiz.classList.contains("is-active")) return;
  ```
  （`onCorrect` は通常 quiz が active の間に呼ばれ、その内部で `showSuccess()`→`show("success")` するので、冒頭ガードは正常系を妨げない。）
- **受け入れ条件**: 6モードいずれでも、回答アクション直後に🏠を押すと **ホームに留まり、はなまるが増えない**（前後で `todayStamps` 不変）。正常プレイの正解→success→スタンプは従来どおり。

## 3. B2. teach モードで ↺やりなおし が状態破壊（高）

- **場所**: teach は `#cards-area`（＝`#redo-btn` を含む, 534行）を使う。`redo-btn` ハンドラ 1855-1858 は無条件で `selected=[]`。teach の `selected` は1字だけ誤りに差し替えた完成語なので、消すとスパース配列になり、その後の正解 `teachPick` でも壊れた語のまま `onCorrect`。
- **修正**: redo を cards 専用に。
  ```js
  $("redo-btn").addEventListener("click", ()=>{
    if(locked || store.mode!=="cards") return;     // teach 等では無効化
    selected=[]; renderSlots(false); updateHintGlow(); $("message").textContent="";
  });
  ```
  （別案: `loadQuestion` で mode!=="cards" のとき `#redo-btn` を hidden に。）
- **受け入れ条件**: teach モードで ↺ を押しても何も起きない／cards モードでは従来どおり消去できる。

## 4. B3. buildChoices が自作単語で look-alike を混入（高）

- **場所**: `buildChoices`（1015-1019）。自作単語のみで使用（組み込み38語は手動キュレートの `choices` を使うので影響なし）。現状は `KANA_POOL` から無作為抽出で twin 回避なし→ る/ろ や さ/き/ち を答えの隣に置きうる。`validCustomWord`（1020）は濁点/小書きを正しく弾くので**妨害札選定だけが問題**。
- **修正**: twin クラスタを除外する。
  ```js
  const LOOKALIKES = [["ね","れ","わ"],["は","ほ","ま"],["さ","き","ち"],["ぬ","め","ね"],["る","ろ"],["つ","う"]];
  function clusterMates(kana){
    const out = new Set();
    for(const c of LOOKALIKES) if(c.includes(kana)) c.forEach(k=>out.add(k));
    return out;
  }
  function buildChoices(word){
    const letters = [...new Set(word.split(""))];
    const banned = new Set();                       // 答えの字の twin は妨害札に使わない
    letters.forEach(l => clusterMates(l).forEach(k => banned.add(k)));
    const need = Math.max(4, Math.min(6, letters.length+2));
    const picked = [];
    for(const k of shuffle(KANA_POOL.filter(k=>!letters.includes(k) && !banned.has(k)))){
      if(picked.some(p => clusterMates(p).has(k))) continue;  // 妨害札同士でも twin を同居させない
      picked.push(k);
      if(letters.length + picked.length >= need) break;
    }
    let out = letters.concat(picked);
    if(out.length < need){                          // 安全プールが足りない稀ケースの補充
      for(const k of shuffle(KANA_POOL.filter(x=>!out.includes(x)))){ out.push(k); if(out.length>=need) break; }
    }
    return out.slice(0, need);
  }
  ```
- **受け入れ条件**: る/さ/は/ね 等を含む自作単語を cards/teach で出しても、答えの隣に twin（る/ろ・さ/き/ち・は/ほ/ま・ね/れ/わ・ぬ/め/ね・つ/う）が出ない。組み込み語は不変。

---

## 5. S1. おてほんデモが しずか/reduced-motion を無視（中）

- **場所**: `setupTraceChar` 1441 `traceDemoTimer=setTimeout(()=>playTraceDemo(true), 280)` を毎文字で無条件起動。`playTraceDemo`（1444）は rAF で inline transform を動かすため、CSS の `body.calm`/`@media(prefers-reduced-motion)` では止まらない。
- **修正**: 自動デモを動き抑制時はスキップ（明示の ▶おてほんボタン=`demo-btn` 1873 は残す）。
  ```js
  const reduceMotion = store.calm || (window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches);
  if(!reduceMotion) traceDemoTimer = setTimeout(()=>playTraceDemo(true), 280);
  ```
  （任意: 自動デモを切る代わりにゴーストを終点に静止表示。）
- **受け入れ条件**: しずかモード or OS の動き低減で、各文字の自動ゴースト運筆が出ない／▶おてほんは手動で動く。

## 6. S2. teach / mirror / ear は4歳に不適（中・設計判断）

いずれも保護者opt-in（子の既定経路ではない）。**コード修正でなく方針の決定**が要る:
- **teach**: 「誤った綴りを見せて直させる」は誤り検出メタスキルで、読めない4歳には早い（正しい語を音で聞かせつつ誤った見た目を出す矛盾）。※誤綴りを**読み上げてはいない**ことは確認済。→ この年齢では外す／または「正しい語を見せて確認させる」形に作り替え。
- **mirror**: 向き当ては4歳には実質50/50（音の手がかり無し）。→ 「5-6さい むけ」表示にするか、誤twinなしの認識活動に。
- **ear**: どこを押しても正解＝スタンプ乱獲可（無害だが報酬希薄化）。→ 最小の判別（2択の絵を選ぶ等）を足すか、「休憩」扱いにして採点しない。
- **共通の軽い対応**: 親シートのモード選択を「4歳向け（ふだ/てがき/てをたたこう）」と「おにいさん・おねえさん向け（むき/おしえて/おみみ）」に分け、年齢ヒントを1行添える。

## 7. S3. clap-reset / next-btn の再入ガード＋clap叩きすぎ（中）

- **場所**: `clap-reset` 1865-1867（`if(locked)` 無し）、`next-btn` 1859（デバウンス無し）、`clapTap` 1199-（オーバーシュートで全リセット）。
- **修正**:
  ```js
  $("clap-reset").addEventListener("click", ()=>{ if(locked) return; clapCount=0; updateClap(); $("message").textContent=""; });

  let navLock=false;
  $("next-btn").addEventListener("click", ()=>{ if(navLock) return; navLock=true; nextQuestion(); setTimeout(()=>navLock=false,400); });
  ```
  任意: `clapTap` で `word.length` を超えたら全リセットせず**上限でクランプ**（最後のドットを光らせる）方が、連打する4歳にやさしい。
- **受け入れ条件**: 正解待ち中に clap-reset を押してもドットと保留中の `onCorrect` がズレない／つぎへ連打で問題を飛ばさない。

## 8. S4. 自作単語フィードバックの行き先＋aria-live／死にコード（低）

- **場所**: `addCustomWord` 1764-（検証/成功メッセージを `#focus-text`=週次トレイルのキャプション 660行に書いており、`aria-live` も無い）。`PROFILE_AVATARS`（776）は未使用（`addProfile` は `PROFILE_EMOJIS` を使用）。
- **修正**: `.custom-panel` 内に `aria-live="polite"` のフィードバック要素を置き、そこへ書く。`PROFILE_AVATARS` 行を削除。
- **受け入れ条件**: 単語追加の可否がパネル内に出て SR で読まれる／週次トレイル欄に混入しない／未使用定数なし。

---

## 9. 回帰OK（このコミットでも壊れていない＝触らない）

- 既存修正6件すべて健在（🏠離脱・誤答プレフィックス・てがき時間ベース救済＋全塗りガード・保護者フォーカストラップ・played≠correct・F-1）。
- **ストレージ移行は安全**（`loadStore` の p1 レガシーフォールバック 802-804 で既存記録を継承、`Object.assign(defaultStore(), s)` で自己修復、新キーへ保存）。プロフィール間はキー分離で混ざらない。
- 単一ファイル維持・組み込み語の look-alike 回避維持・`validCustomWord` の濁点/小書き拒否・全モードのやさしいトーン・teach は誤綴りを読み上げない。

## 10. Codex に渡す用（コピペ可）

> `docs/handoff-fixes-3.md` を読み、**B1 → B2 → B3 → S1 → S3 → S4** を実装してください（前提コミット `610ab6f`＋`06b227d`）。S2 は設計判断なので**実装せず、方針メモだけ**残してください。
> 制約: `index.html` 1ファイルのみ、Service Worker 追加なし、行番号でなくコード片一致で編集。§9「回帰OK」の既存実装（🏠離脱・誤答プレフィックス・てがき救済＋全塗りガード・フォーカストラップ・played≠correct・F-1・ストレージ移行）を壊さないこと。
> 特に B1 は完成アクションの `setTimeout` 6か所すべてを `solveTimer` に束ね、`goHome` で `clearTimeout`＋`onCorrect` 冒頭ガードを入れる。B3 は組み込み `WORDS` の `choices` には触らない（自作単語の `buildChoices` のみ）。
> `python -m http.server 8000` で起動し、(1) 各モードで回答直後に🏠→ホーム維持＆スタンプ不変、(2) teach で↺無効、(3) る/さ/は/ね を含む自作単語で twin が妨害札に出ない、(4) しずかモードで自動運筆デモが出ない、を確認。**この1タスクで1コミット/1PR**。
