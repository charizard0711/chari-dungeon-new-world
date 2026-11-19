const entries: [string,string,string,string][] = [
 ['HP全回復。装備中の武器・盾を全修復し+1強化。さらに予備からランダムで武器最大2本・盾最大2個を全修復し、それぞれ+1強化（重複なし）。', 'Fully restores HP. Fully repairs and enhances your equipped weapon and shield by +1, plus up to 2 random spare weapons and 2 random spare shields. Each item is selected once.', '체력을 모두 회복합니다. 장착한 무기와 방패를 완전히 수리하고 +1 강화합니다. 추가로 예비 무기 최대 2개와 예비 방패 최대 2개를 무작위로 선택해 완전히 수리하고 각각 +1 강화합니다. 중복 선택은 없습니다.', '完全恢复生命值。完全修复并强化已装备的武器和盾牌+1，再随机选择最多2把备用武器和2个备用盾牌，完全修复并各强化+1。不会重复选择。'],
 ['ふしぎパンを食べた！ HP全回復！ 装備中の武器・盾と、予備からランダムで武器最大2本・盾最大2個を全修復し、それぞれ+1強化した。', 'Ate the Mystery Bread! HP fully restored! Equipped gear and up to 2 random spare weapons and 2 spare shields were fully repaired and enhanced by +1 each.', '신비한 빵을 먹었다! 체력 완전 회복! 장착 장비와 무작위 예비 무기 최대 2개 및 방패 최대 2개를 완전히 수리하고 각각 +1 강화했다.', '吃下了神奇面包！生命值完全恢复！已装备的武器和盾牌，以及随机选择的最多2把备用武器和2个备用盾牌已完全修复并各强化+1。'],
];
export const BREAD_ENGLISH=Object.fromEntries(entries.map(([ja,en])=>[ja,en]));
export const BREAD_KOREAN=Object.fromEntries(entries.map(([ja,,ko])=>[ja,ko]));
export const BREAD_CHINESE=Object.fromEntries(entries.map(([ja,,,zh])=>[ja,zh]));
