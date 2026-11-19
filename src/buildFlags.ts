// Replaced at build time. The public build has neither debugging nor replay access.
declare const __GAME_DEV_TOOLS__: boolean;
declare const __RANKING_VERIFIER__: boolean;
export const DEV_TOOLS = typeof __GAME_DEV_TOOLS__ !== 'undefined' && __GAME_DEV_TOOLS__;
export const VERIFIER = typeof __RANKING_VERIFIER__ !== 'undefined' && __RANKING_VERIFIER__;
export const localQaEnabled = () => DEV_TOOLS && typeof location !== 'undefined' && location.hostname === 'localhost';
