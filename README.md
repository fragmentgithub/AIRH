# ひらがな ことばあそび

4歳児むけの、ひらがなを **えらんで／なぞって** ことばを つくる 知育ゲーム。

- 単一ファイル（`index.html`）だけで動く・ビルド不要・オフラインOK
- **ふだモード**（文字札をタップ）／**てがきモード**（なぞり書き）の切り替え
- Web Speech API による読み上げ、花丸（はなまる）スタンプ演出、保護者向け簡易画面
- 濁点・半濁点・小さい字を使わない、4歳児にやさしい単語（40語）

## あそぶ

📱 **https://fragmentgithub.github.io/AIRH/**

スマホ（iPhone / Android）の Safari・Chrome で開けます。**「ホーム画面に追加」**でアプリのように全画面で遊べます。

> 音声をいちばん自然にするには、iPhone なら標準の Safari（日本語音声）でOK。PCでは Microsoft Edge が高品質な日本語音声（ナナミ）を使えます。

## ローカルで試す

`file://` だと音声・フォントが制限されるため、簡易サーバ経由を推奨:

```
python -m http.server 8000
# → http://localhost:8000/
```

## 仕様

設計・仕様書: [`docs/hiragana-word-game-spec.md`](docs/hiragana-word-game-spec.md)
