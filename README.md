# ひらがな ことばあそび

4歳児むけの、ひらがなを **えらんで／なぞって** ことばを つくる 知育ゲーム。

- `index.html` + `styles.css` + `src/*.js` で動く・ビルド不要・GitHub Pages 配布
- Service Worker によるオフライン起動、録音音声フォールバック（`assets/audio/`）
- **ふだモード**（文字札をタップ）／**てがきモード**（なぞり書き）の切り替え
- Web Speech API による読み上げ、花丸（はなまる）スタンプ演出、保護者向け簡易画面
- 濁点・半濁点・小さい字を使わない、4歳児にやさしい単語（40語）

## あそぶ

📱 **https://fragmentgithub.github.io/AIRH/**

スマホ（iPhone / Android）の Safari・Chrome で開けます。**「ホーム画面に追加」**でアプリのように全画面で遊べます。

> 音声をいちばん自然にするには、iPhone なら標準の Safari（日本語音声）でOK。PCでは Microsoft Edge が高品質な日本語音声（ナナミ）を使えます。

## ローカルで試す

ES Modules を使うため、ローカル確認は簡易サーバ経由で行います（`file://` 直開きは対象外）:

```
python -m http.server 8000
# → http://localhost:8000/
```

## 開発

```
npm test
npm run generate-audio
```

`generate-audio` は Windows の日本語音声（例: Microsoft Haruka）で `assets/audio/*.wav` を再生成します。

## 仕様

設計・仕様書: [`docs/hiragana-word-game-spec.md`](docs/hiragana-word-game-spec.md)
