import { LOADING_TIPS } from './localeLoading';

/** Presentation-only shuffle: never consume the ranked game's seeded random stream. */
export function createLoadingTipPicker(random = Math.random): () => string {
  let remaining: string[] = [], previous = '';
  return () => {
    if (!remaining.length) {
      remaining = [...LOADING_TIPS];
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      if (remaining.length > 1 && remaining[remaining.length-1] === previous) {
        [remaining[0], remaining[remaining.length-1]] = [remaining[remaining.length-1], remaining[0]];
      }
    }
    previous = remaining.pop()!;
    return previous;
  };
}
