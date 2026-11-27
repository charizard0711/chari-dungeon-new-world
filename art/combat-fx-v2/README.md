# 崩落床と敵の攻撃エフェクト — 2026-11-27

生成: built-in image_gen.imagegen。既存ゲームに合わせた新規画像。

- `public/assets/online/combat-fx-v2/crystal-pit.png`: 1マスの赤い岩盤の崖と紫水晶。ゲーム内では48px、共有テクスチャ128px。
- `public/assets/online/combat-fx-v2/enemy-attacks.png`: 6列×4行。爪・噛みつき・打撃・魔法の6コマ。実行時は768×512へ縮小し、最大24個を再利用。

## Prompts

Pit: One square collapsed floor tile for an overhead grid RPG. Dark burgundy stone, jagged broken rim contained in one cell, deep vertical inner cliff face, small purple amethyst below, near-black abyss. Crisp painted pixel art readable at48px. No surrounding tiles, text, characters, or isometric diamond.

Effects: Exact6-column4-row sprite sheet, transparent background, each row a complete6-frame impact from flash through dissolution. Rows: orange-white triple claw slash; ivory snapping fangs; golden heavy impact with stone chips; violet-blue magic starburst. Crisp painted pixel effects readable at64px. No labels, borders, weapons, scenes, or characters.

## Verification

Silent Phaser preview: independent one-cell pits, attack effect playback, actual inventory recall returns to floor entry. SQL tests cover same-room/floor, occupied/blocked entry, consumption, floor2, cinematic and rail restrictions. Effects tests cover bounded pool, animation frames, culling, reuse, and teardown. Production recall migration applied successfully (helper remains private).
