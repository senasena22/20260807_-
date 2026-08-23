# いっぽ

毎日ひとつずつ積み上げるSRS(間隔反復)復習アプリ。複数のデッキ（韓国語・ワイン試験・自作デッキなど）を管理でき、学習状況はこの端末のlocalStorageに保存され、PWAとしてホーム画面に追加できます。外部APIは呼びません（無料・オフライン動作）。

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run preview
```

`dist/` ができあがるので、GitHub Pagesなど静的ホスティングにそのままデプロイできます。
