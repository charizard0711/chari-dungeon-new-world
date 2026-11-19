/** Tips describe existing mechanics; the three translations are English, Korean and Simplified Chinese. */
const tips: Record<string, [string, string, string]> = {
  'お金がたまったら、ガチャで装備を整えよう。': [
    'Save gold and roll the gacha for better gear.',
    '골드를 모았다면 뽑기로 장비를 갖춰 보세요.',
    '攒下金币后，试试抽奖，为冒险备好装备。',
  ],
  'クロワッサン型の「ふしぎパン」はHPを全回復。HPが減ったときや、強敵に挑む前に。': [
    'The croissant-shaped Mystery Bread fully restores HP. Save it for low health or before a tough fight.',
    '크루아상 모양의 신비한 빵은 HP를 전부 회복합니다. HP가 낮거나 강적에게 도전하기 전에 드세요.',
    '牛角包形状的「神奇面包」能回满生命。生命不足或挑战强敌前，记得使用。',
  ],
  '「ふしぎパン」は所持中の武器と盾をランダムに1個ずつ修復して＋1強化。装備の消耗も使いどきの目安。': [
    'Mystery Bread also repairs and enhances one random owned weapon and shield by +1. Worn gear is another reason to use it.',
    '신비한 빵은 보유한 무기와 방패를 무작위로 하나씩 수리하고 +1 강화합니다. 장비가 닳았을 때도 유용해요.',
    '「神奇面包」还会从持有的武器和盾牌中各随机选一件，修复并强化＋1。装备磨损时也是使用的好时机。',
  ],
  'いつもと色が違う武器が出るかも？ 名前の「★」にも注目してみよう。': [
    'Could your next weapon be a different color? Keep an eye out for a ★ in its name.',
    '평소와 색이 다른 무기가 나올지도? 이름에 붙은 「★」도 눈여겨보세요.',
    '下一件武器，会不会有不一样的颜色？也留意一下名字里的「★」吧。',
  ],
  'お気に入りの装備は、壊れる前に修復しよう。次の戦いの前に耐久をチェック。': [
    'Repair your favorite gear before it breaks. Check its durability before the next fight.',
    '아끼는 장비는 부서지기 전에 수리하세요. 다음 전투 전에 내구도를 확인해 보세요.',
    '心爱的装备，记得在损坏前修复。下次战斗前，先检查耐久。',
  ],
  '歩いてスキルをチャージ。強敵に会う前に、スキルが使えるか確認しよう。': [
    'Walking charges your skill. Check that it is ready before taking on a tough enemy.',
    '걸으면 스킬이 충전됩니다. 강적을 만나기 전에 스킬을 쓸 수 있는지 확인하세요.',
    '行走可以为技能充能。迎战强敌前，先确认技能是否就绪。',
  ],
  '敵の攻撃予告が見えたら、まずは回避。足元だけでなく周りのマスにも注目。': [
    'See an attack warning? Dodge first. Watch the nearby tiles as well as the one under your feet.',
    '공격 예고가 보이면 먼저 피하세요. 발밑뿐 아니라 주변 칸도 살펴보세요.',
    '看到攻击预警，先躲开。除了脚下，也要留意周围的格子。',
  ],
  '強化に失敗しても装備と強化値はそのまま。巻物を手に入れたら、もう一度挑戦しよう。': [
    'Failed an enhancement? Your gear and its upgrade level stay intact. Find another scroll and try again.',
    '강화에 실패해도 장비와 강화 수치는 유지됩니다. 두루마리를 구하면 다시 도전해 보세요.',
    '强化失败后，装备与强化值都会保留。找到新的卷轴，再试一次吧。',
  ],
};

export const LOADING_TIPS = Object.keys(tips);
const messages = {
  ...tips,
  '冒険のヒント': ['ADVENTURER’S TIP', '모험의 힌트', '冒险小提示'],
  'ダンジョンの画像を読み込み中…': ['Preparing your adventure...', '모험을 준비하는 중…', '正在准备冒险…'],
  '画像を再取得しています…': ['Retrying the download...', '다운로드를 다시 시도하는 중…', '正在重新下载…'],
  '準備ができました': ['Ready to go', '준비 완료', '准备就绪'],
};
export const LOADING_ENGLISH: Record<string,string> = Object.fromEntries(Object.entries(messages).map(([key,value])=>[key,value[0]]));
export const LOADING_KOREAN: Record<string,string> = Object.fromEntries(Object.entries(messages).map(([key,value])=>[key,value[1]]));
export const LOADING_CHINESE: Record<string,string> = Object.fromEntries(Object.entries(messages).map(([key,value])=>[key,value[2]]));
