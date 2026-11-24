# フロア効果パネル 2026-11-24

ZEROオンライン専用。回復は各部屋の計11枚、麻痺は通路2枚。ボス戦では攻撃アップと防御アップを各1枚、重ならないランダム位置に生成する。床の破壊でパネルも消え、そのパネル由来の効果だけ終了する。同じ挑戦中には補充しない。

回復は25HP、キャラごと・パネルごとに1回。満タンでは消費しない。麻痺は次の行動を1回待機に置き換え、電撃を表示する。攻撃・防御は1.2倍で、泉の倍率とは別に乗算する。左上のアイコンはマウス・タッチで効果を読める。回復の持続アイコンは出さない。攻撃ダウン・防御ダウンのアセットと倍率処理も用意したが、今回の配置指定には含めていない。

サーバー: 202611240002_online_effect_panels.sql。既存RPCを非公開の前段に移し、移動結果・麻痺・回復・倍率をサーバーで処理する。既存の泉、共有ボス演出と行動ロックは維持する。

検証: test-effect-panels.mjs、test-boss-cinematics.mjs、TypeScript、production build。無音のブラウザーで配置、状態アイコン、ツールチップ、麻痺表示とコンソールを確認。実機iPhoneの検証は含まない。

## 画像生成
組み込みimage_gen、transparent_background=true、承認済み比較画像を参照。
出力: public/assets/online/effect-panels-v1/panels.png

Prompt:
Convert this approved six-panel design into a CLEAN GAME SPRITE ATLAS. Exactly THREE columns by TWO rows, each equal square cell. Preserve the six tile designs and order exactly: row1 green healing plus, yellow paralysis lightning/boot, golden attack-up sword with UP arrow; row2 purple defense-down broken shield with DOWN arrow, red attack-down sword with DOWN arrow, cyan defense-up shield with UP arrow. Large simple readable symbols, stone-and-metal square borders, crisp painted pixel game style. True straight overhead square tiles. Remove ALL text and captions. Remove the charcoal board background completely: transparent empty canvas around tiles, no background rectangles, no lighting haze outside silhouettes. Each tile centered entirely within its own equal square cell, same footprint and scale, 6% transparent gutter on all sides. No symbol or tile may cross a cell boundary. These are six flat floor tiles, not a scene or comparison poster. Preserve arrows and clear color contrast.
