# 2026-11-19 町の更新

- チャットは新規メッセージのキャラクターIDに紐づけ、頭上へ6秒表示。32コードポイントを超える文は「…」で省略。チャット欄には全文を残す。入場時の過去ログは吹き出しにしない。
- オンラインのPCメニューとモバイルナビから秘密クエストを削除。
- Webページ下部のWindows版ダウンロード案内と、そのブロックのスタイルを削除。
- 移動は260ms/マスから170ms/マスへ変更。距離に合わせる踏み替えと重心移動は維持。
- ルファルゼントのオーラは共有エフェクトの未読込テクスチャに依存せず、専用の柔らかい黒紫の霧をCanvasで生成。ソロとオンラインの共有オーラに適用。
- 泉の北側（12,5）に壊れない練習樽を設置。クリックで接近・攻撃、近くではSpaceでも攻撃可能。攻撃モーションとダメージを他プレイヤーにも同期。HP・経験値・報酬・耐久・アイテム消費は発生しない。

DB: `202611190001_online_training_chat.sql`。攻撃対象はサーバー側の固定座標。距離・直線上の障害物・320msの攻撃間隔を検証し、ダメージをサーバーの装備カタログから計算。クライアントのダメージや他プレイヤーを指定する値は利用しない。履歴テーブルは直接アクセスを許可しない。

検証: DBテストで距離、連打、衝突、消費・報酬なし、他ユーザーへのヒット同期、チャットのキャラクター紐付けを確認。文字省略と170msの歩行設定もテスト。ブラウザーは `mute=1` でBGM・効果音とも無音。ローカル表示確認で樽への接近と攻撃、吹き出し、秘密クエストとダウンロード案内の非表示、盾の黒い霧を確認。

本番DB適用済み。公開コミット `db03694`、GitHub Pagesジョブ `44333775565` は成功。本番の新モジュール `online-town-7decc82fa26b.js` と樽PNGのHTTP 200、ダウンロード案内の削除、専用盾オーラの参照を確認。既に開いているゲームでは再読み込みが必要。

## 樽の制作

Built-in image_genの生成モード（既存の樽を参照、透明背景）。CLI/APIは使用していない。

保存先: `public/assets/online/training-barrel-v1.png`。参照: `public/assets/terrain/objects/room-props/barrel.png`。生成画像は実アルファ0〜255を確認し、そのまま保存。

Prompt: Create one new RPG game prop sprite using the reference barrel's exact dark fantasy pixel-painted material language. A reinforced indestructible practice barrel / training dummy: upright wooden barrel with iron hoops, a round ivory-and-muted-red bullseye practice target strapped to its front, a little straw protruding from its top. Entire prop intact and sturdy. Same top-down three-quarter orthographic view as reference, not isometric. Transparent alpha background; no ground, rectangle, glow, words or UI. Centered isolated full sprite with transparent margins, readable at 75 pixels tall. Brown wood, dark iron, subtle warm highlights.

## マス移動と全装備ドロップ（追加修正）

- 武器・服・盾に「落とす」を用意。装備中は解除して落とし、他プレイヤーは1個ずつ拾える。旧武器専用RPCも継続対応。
- サーバーは全町操作を短いトランザクションロックで直列化し、入場先・移動先の占有を検査。再接続で既存の座標が占有されていたら近くの空きマスへ移す。
- 描画も上下左右の隣接マスを150msずつ補間。自分はサーバー承認後に1マス移動し、他人も壁・プレイヤーを避けたマス経路で追従する。
- ソロの石板アセット `terrain/ruins-floor-v1/1.png` を1フレーム＝1マスに使用し、48pxごとの目地を表示。
- 装備・矢・鞘・手持ち画像・各防具のキャラシート・★武器画像を読み込む。緑の未読込プレースホルダーを実画像に置換。
- ソロの `EquipmentRenderer` / `PlayerAnimation` をオンラインでも使用。通常58ms／アルカディア200msの構え、刀などの専用フレーム周期、踏み込みと復帰、弓・銃の飛び道具を適用。攻撃履歴に武器キーを記録し、他プレイヤーにも同じ装備で描画。

DB移行: `202611190002_online_grid_equipment.sql`。本番SQL Editorで完全一致の貼り付けを確認して適用し、Successを確認済み。
検証: 型検査、プロダクションビルド、PGliteの全回帰テスト、服・盾の通常ユーザー間転送、装備解除、重複入場回避、占有マス移動拒否、再接続時の重なり解消、マス経路の上下左右のみ・障害物回避を確認。ブラウザーは `mute=1` でオーディオデバイス自体を無効化。矢画像384px、攻撃6フレーム、歩行6フレーム、斜め移動0を確認。

追加公開: コミット `3c93312`。Pages `44531124707`。公開の `online-release.json` が新しい `index-0fee409f4eda.js` / `online-town-9c45fedb1aac.js` を返し、両JSのHTTP 200を確認。

## 右クリック操作・スキル・履歴

- 噴水を芝生3×3マスの中央へ移し、144pxで草地内に収める。
- チャットのHTML必須バリデーションを削除。空送信は何も送らず終了。
- ログ・チャット各100件を保持。OS既定のスクロールバーを出さず、金色の専用トラック・ドラッグつまみ・上下ボタン・ホイール・Home/End/Pageキーで閲覧。タブごとの閲覧位置を維持。
- 右クリックは、その方向へのその場攻撃。右下の武器スキルボタンまたはQで選択し、右クリックで発動。ソロの武器スキル定義・範囲計画・描画演出を再利用し、町の48pxタイルに合わせる。選択中は範囲表示を維持。
- サーバーで武器所有・方向・範囲・障害物・ダメージ・再使用100歩を検証。攻撃先は練習樽だけ。プレイヤーやNPCへのダメージは発生しない。樽は壊れず、押し出し・スタンなどで移動しない。
- 自分のマスの左クリックは足踏み（座標を変えず1歩進行）。移動・足踏みでチャージを進める。短剣の零刻領域は本人の5歩だけ進め、終了時に正面1マスへ通常攻撃2倍の追撃。他プレイヤーの操作は停止しない。
- スキル・空振り・足踏みも共有イベントに記録し、他プレイヤーに同じ演出を描く。チャージと零刻領域の残りはキャラクターに保存。

移行: `202611190003_online_controls_skills.sql`。型検査・全ビルド・PGliteの全回帰テスト成功。8武器種×4方向×4地点の範囲がソロと一致、通常攻撃の方向・空振り、スキルのサーバー計算、チャージ偽装拒否、足踏みでの座標維持、零刻領域の終了追撃を検証。無音（audioDisabled=true）のローカルブラウザーで全8種の演出、Q→右クリック、ボタン→右クリック、110件から100件保持、先頭へのスクロール、ホイール、空送信でバリデーションなしを確認。

公開済み: `e9d2abe`。Pages `44546273255` 成功。本番SQL Editorで新移行の完全一致とSuccessを確認。公開JSONの `index-3c4b54328f96.js` / `online-town-8f3c96822eea.js` および新CSSのHTTP 200を確認。確認画像は `outputs/online-controls/town-chat-skills.jpg`。
