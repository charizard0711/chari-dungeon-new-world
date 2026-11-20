# 金貨チートと武器音

スーパーアカウントで設定に `19960711` を入力し、全アイテム一覧の上部にある `＋10,000 G` / `＋100,000 G` を押すと、現在のキャラの所持金に加算する。町・ダンジョンで利用可能。現在のスーパー権限と一覧の解放をRPCで確認し、金額の不正値・整数上限超過を拒否する。アカウントへのスーパー権限の付与は行わない。

`202611200006_online_gold_cheat.sql` を公開Supabaseへ適用。冒険用RPCを非公開ヘルパーにして、新RPCから既存処理を呼ぶ。

武器音は `C:/chari-dungeon-desktop/Unity/Assets/Chari/Resources/Audio/` の以下のWAVを変更せずコピーした。対応ファイルとSHA-256は `weapon-audio-v1-sources.json` に記録する。

| 武器 | CHARIAの元音源 | 保存先 |
|---|---|---|
| 剣・短剣・槍・刀・双剣 | l2-sword-swish.wav | public/assets/online/weapon-audio-v1/sword.wav |
| 大剣・勇者の剣 | l2-greatsword-swish.wav | public/assets/online/weapon-audio-v1/greatsword.wav |
| 弓 | l2-bow_small_1.wav | public/assets/online/weapon-audio-v1/bow.wav |
| 銃 | l2-sonic-rage-shot.wav | public/assets/online/weapon-audio-v1/handgun.wav |

CHARIA現行の銃の通常音は弓と共通の割当だが、ZEROでは銃を聞き分けられるよう同プロジェクト内のショット音を採用した。命中音は従来のまま重ねる。空振りでも振り音・射出音を再生し、近くの他プレイヤーの攻撃も8マス以内なら再生する。全体ミュート・SE設定・`?mute=1`・`noAudio` を尊重する。テスト中は音を出さない。

検証：`npm run test:gold-audio`、`npm run test:adventure`、`npm run test:town`、`npm run build`。ローカルの架空スーパーキャラで設定→一覧→生成を操作し、3,000→13,000 Gを確認。音のテストは再生関数をモックし、実音の試聴はしない。
