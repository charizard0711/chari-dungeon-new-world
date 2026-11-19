# 2026-11-20 町のカーソル・音・入場表示

- Chrome対応の32px SVGカーソルをCanvas内に設定。金色の矢印、攻撃対象（町は練習樽）の剣、スキル選択中の照準。テキスト欄は通常の文字入力カーソル。ソロも通常矢印・敵の剣に対応。
- 入場RPCの結果に含まれる最新メッセージIDを境界として保持し、それより新しい発言だけをチャットへ渡す。退場・再入場では新しい境界と履歴に切り替える。古い吹き出しも出さない。
- 自分の命中時だけCHARIAと同一の命中WAVを再生。空振り、足踏み、過去イベントでは鳴らさない。構え・飛び道具・スキルの着弾時間に合わせてダメージ表示と命中音を遅延。
- 自分の1マス移動完了・足踏みで控えめな足音。効果音ON/OFF、効果音音量、全体ミュート、mute=1、noAudioを再生時に確認。設定変更を即時反映。
- 町への入場リクエスト時から、既存の湖・噴水の背景画に接続・画像読み込み・町の準備の進捗を表示。町の最初の描画後にフェードアウト。背景は事前読み込みし、場面を離れた時はDOM・ResizeObserver・イベントを破棄。

## 音源

命中: `C:/chari-dungeon-desktop/Unity/Assets/Chari/Resources/Audio/l2-soulshot-hit.wav`。同プロジェクトの `Runtime/GameAudio.cs` がhitに使用している音源を、バイト単位で同じものとして `public/assets/online/charia-hit-v1.wav` にコピー。モノラル22050Hz、1.855秒。
足音: 同 `GameAudio.Synthesize("step")` の平滑ノイズ、85Hzベース、減衰・アタックの式を使って0.09秒/22050Hz/16bitモノラルWAVを作成。ノイズ生成器はPython、音の構成はCHARIAの式。`public/assets/online/charia-step-v1.wav`。
背景画: `public/assets/ui/title-lake-v2/background.webp` を再利用。画像生成は行っていない。

## 検証

`test-online-presentation.mjs` で入場・再入場の境界、履歴除外、命中・足音のルート、音量変更、効果音OFF/全体ミュート/mute URL/noAudioで再生なしを検証。音の呼び出しはモックであり、実出力なし。WAVのヘッダーとCHARIA原本の完全一致も確認。
型検査とビルド成功。ブラウザーは `mute=1` / audioDisabled=true。古いチャット0件、新しい発言1件、CSSカーソルarrow/attack/skillとテキスト欄text、読み込み完了後の町表示、背景1672pxの正常読込を確認。画像: `outputs/online-presentation-20261120/loading.jpg`。

公開: コミット `2c927d3`、Pagesジョブ `44553318734` 成功。公開JSONが新JSを参照し、JS・CSS・命中音・足音・背景画のHTTP 200を確認。DB変更なし。

追記: 攻撃用の剣カーソルを左右反転し、通常カーソルと同じ左上向きに変更。ホットスポットも27,5から5,5へ移動。CSSのみ更新。


## キャラクター選択の装備表示とフード

選択カードの固定leather画像を廃止。キャラクターの保存済みgearに従い、体・武器・盾・鞘を共通EquipmentRendererで描き、RenderTextureからカード用Canvasへ一度だけ描画。装備なし、星付き装備にも対応。読込中の離脱でロード待ちを解放し、描画用の一時オブジェクトは破棄。大きな武器は収まるように自動調整。
男性の紅黒の天聖鎧(crimson)・蒼白の天聖鎧(aqua)の後ろ姿16コマを、髪を覆うフードへ修正。女性用は元からフードを着用しているので維持。元の前向き・横向き48コマの画素は完全一致。ソロ・町ともバージョン付きアトラスを参照。
画像: public/assets/characters/hooded-back-v2/male-{crimson,aqua}.png。方法・全プロンプト: art/hooded-back-v2/prompts.md。built-in image_gen使用。
型検査、画像梱包時の画素一致検証、無音ブラウザーで装備4パターンと2着の後ろ姿を確認。DB変更なし。

装備・フード修正の公開: `5cfeb4c`、Pages `44557904566` 成功。公開JSON、新JS、両フードPNGのHTTP 200を確認。
