# アニメクイズワールド

アニメ作品のビジュアルを見てタイトルを当てる無料クイズサイトです。

## 公開サイト
GitHub Pagesを有効化すると、通常は次のURLで公開されます。
https://the-rascal-of-sakurasou.github.io/anime-quiz-world/

## 主な機能
- AniListの作品データを使った4択クイズ（最大10問）
- 正解数・正答率の表示
- AniListを使った作品検索
- スマートフォン・PC対応のレイアウト

## 公開方法
1. GitHubリポジトリの **Settings → Pages** を開く
2. **Build and deployment** の Source を **Deploy from a branch** にする
3. Branch を **main**、フォルダーを **/(root)** に設定し、Saveを押す
4. 数分後に上記の公開URLを確認する

## データと費用
- ホスティング：GitHub Pages（無料枠）
- 作品データ：AniList GraphQL API
- 独自サーバーや有料データベースは使っていません
- クイズのスコアはページ内だけで管理し、アカウントやオンラインランキングには保存しません
- 動作にはインターネット接続が必要です。APIの仕様・利用制限により動作が変わる場合があります

## 権利表記
本サイトは非公式のファンサイトです。作品名・画像等の権利は各権利者に帰属します。作品データは [AniList](https://anilist.co/) のAPIを利用しています。
