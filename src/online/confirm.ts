import { online } from './api';
import { emailLanguage, confirmationText } from './emailLanguage';
export function mountEmailConfirmation() {
  const params = new URLSearchParams(location.search);
  const token = params.get('token_hash');
  const language = emailLanguage(params.get('lang') ?? 'ja');
  // Remove the one-time token before the player can follow any other link.
  history.replaceState(null, '', location.pathname);
  document.documentElement.lang = language;
  const text = confirmationText[language];
  const root = document.getElementById('confirmation')!;
  const heading = document.createElement('h1'); heading.textContent = text[0];
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = token ? text[1] : text[5];
  const button = document.createElement('button'); button.textContent = text[2]; button.disabled = !token || !online;
  const back = document.createElement('a'); back.href = './'; back.textContent = text[4];
  root.replaceChildren(heading, status, button, back);
  button.onclick = async () => {
    button.disabled = true;
    try {
      const { error } = await online!.auth.verifyOtp({ token_hash: token!, type: 'email' });
      status.textContent = error ? text[5] : text[3];
      if (!error) button.remove();
    } catch { status.textContent = text[5]; button.disabled = false; }
  };
}
