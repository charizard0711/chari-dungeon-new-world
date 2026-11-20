export const EMAIL_LANGUAGES = ['ja', 'en', 'ko', 'zh-CN'] as const;
export type EmailLanguage = typeof EMAIL_LANGUAGES[number];
export function emailLanguage(value = document.documentElement.lang): EmailLanguage {
  return EMAIL_LANGUAGES.includes(value as EmailLanguage) ? value as EmailLanguage : 'ja';
}
export const confirmationText = {
  ja: ['メールアドレスの確認', 'ボタンを押してChari Dungeon: ZERO のアカウントを認証してください。', 'メールアドレスを確認する', '認証できました。ゲームに戻り「スタート」を選んでください。', 'ゲームへ戻る', 'リンクが無効、または期限切れです。ゲームで確認メールを再送してください。'],
  en: ['Confirm your email', 'Confirm your Chari Dungeon: ZERO account using the button below.', 'Confirm email address', 'Email confirmed. Return to the game and choose Start.', 'Return to game', 'This link is invalid or expired. Request a new confirmation email in the game.'],
  ko: ['이메일 주소 확인', '아래 버튼을 눌러 Chari Dungeon: ZERO 계정을 인증해 주세요.', '이메일 주소 확인하기', '인증되었습니다. 게임으로 돌아가 시작을 선택해 주세요.', '게임으로 돌아가기', '링크가 유효하지 않거나 만료되었습니다. 게임에서 확인 메일을 다시 보내 주세요.'],
  'zh-CN': ['验证邮箱', '请点击下方按钮验证 Chari Dungeon: ZERO 账号。', '验证邮箱地址', '验证成功。请返回游戏并选择开始。', '返回游戏', '链接无效或已过期。请在游戏中重新发送验证邮件。']
} as const;
