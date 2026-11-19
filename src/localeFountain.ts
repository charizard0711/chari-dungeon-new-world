// Exact strings keep the fountain preview readable in every supported language.
const entries: [string, string, string, string][] = [
  ['魔法のお菓子', 'Magic Sweets', '마법의 과자', '魔法糖果'],
  ['金の泉', 'Golden Fountain', '황금 샘', '金色泉水'],
  ['銀の泉', 'Silver Fountain', '은빛 샘', '银色泉水'],
  ['古代の噴水', 'Ancient Fountain', '고대 분수', '古代喷泉'],
  ['使用済み。この泉はもう使えません。', 'Used up. This fountain cannot be used again.', '이미 사용한 샘입니다. 다시 사용할 수 없습니다.', '已使用。这座泉水无法再次使用。'],
  ['体力を全回復し、毒を治します。', 'Fully restores HP and cures poison.', '체력을 모두 회복하고 독을 치료합니다.', '完全恢复生命值并解除中毒。'],
  ['所持するすべての武器・盾の耐久を全回復し、それぞれ+1強化します。', 'Fully repairs all owned weapons and shields and enhances each by +1.', '보유한 모든 무기와 방패의 내구도를 완전히 회복하고 각각 +1 강화합니다.', '完全修复持有的所有武器与盾牌，并各强化+1。'],
  ['装備中の武器・盾の耐久を全回復します。予備の装備は対象外です。', 'Fully repairs your equipped weapon and shield. Spare gear is unaffected.', '장착한 무기와 방패의 내구도를 완전히 회복합니다. 예비 장비는 제외됩니다.', '完全修复已装备的武器与盾牌。不影响备用装备。'],
  ['この階のボス討伐まで、攻撃力・防御力が1.5倍。', 'Attack and defense ×1.5 until this floor’s boss is defeated.', '이 층의 보스를 처치할 때까지 공격력과 방어력이 1.5배가 됩니다.', '在击败本层首领前，攻击力与防御力变为1.5倍。'],
  ['この階のボス討伐まで、攻撃力・防御力が1.2倍。', 'Attack and defense ×1.2 until this floor’s boss is defeated.', '이 층의 보스를 처치할 때까지 공격력과 방어력이 1.2배가 됩니다.', '在击败本层首领前，攻击力与防御力变为1.2倍。'],
  ['この階のボス討伐まで、攻撃力・防御力が1.1倍。', 'Attack and defense ×1.1 until this floor’s boss is defeated.', '이 층의 보스를 처치할 때까지 공격력과 방어력이 1.1배가 됩니다.', '在击败本层首领前，攻击力与防御力变为1.1倍。'],
  ['加護は次の階へ持ち越せません。倍率は重複しません。', 'The blessing ends on the next floor. Multipliers do not stack.', '축복은 다음 층으로 이어지지 않습니다. 배율은 중첩되지 않습니다.', '祝福无法带到下一层。倍率不叠加。'],
  ['1回だけ使えます。泉に向かって移動すると使用します。', 'One use only. Move into the fountain to use it.', '한 번만 사용할 수 있습니다. 샘을 향해 이동하면 사용합니다.', '仅可使用一次。向泉水移动即可使用。'],
];
export const FOUNTAIN_ENGLISH = Object.fromEntries(entries.map(([ja, en]) => [ja, en]));
export const FOUNTAIN_KOREAN = Object.fromEntries(entries.map(([ja, , ko]) => [ja, ko]));
export const FOUNTAIN_CHINESE = Object.fromEntries(entries.map(([ja, , , zh]) => [ja, zh]));
