# Town gardens, warehouse drag and classic-attack prototype

The town now exposes three existing lots per district (tiers 1, 5 and 9: 500,000 / 2,500,000 / 10,000,000 G). Their identifiers, sizes, interior layouts and ownership are unchanged. Every house has a walkable lawn and entrance path with solid visible fencing. Boundary fencing marks the nonwalkable exterior of town. Vacant houses stop locally before a travel/loading request; the existing server permission check also rejects entry.

Migration 202611210006 reversibly marks the other lots retired, filters public housing listings, rejects their purchase/entry, and includes garden fence collision. It refuses to retire any purchased home. Presence and ground loot on newly blocked cells relocate to free town cells. Applied to production: 12 active homes, 1 preserved owner (north-1), 0 blocked town players. No accounts, inventories or ownership records deleted.

Warehouse icons support window-tracked pointer dragging to the opposite column. Equipment identity is retained via instanceId. Item/gold amount uses the existing draft input and validation. Pointer cancellation and Escape clean the ghost; incoming refresh does not rebuild the dragged source. Buttons remain available. Browser fixture verified deposit 3→2/1 and withdrawal 2/1→3/0 with no backend or sound.

The local motion-lab prototype keeps the existing weapon images and new character. Attack timing and melee lunge use OnlineTownScene's 58+210 ms normal attack and 200+260 ms Arcadia attack. Spear remains melee, bow/gun remain ranged. Local prototype is not deployed.

Audio finding: ZERO charia-hit-v1.wav is byte-identical to CHARIA Unity Resources/Audio/l2-soulshot-hit.wav (SHA256 62f4d246b41c678bd3767e739c17256c42661137aeb17528d33d37025b96a90f). CHARIA GameAudio.cs varies hit pitch .92–1.08; ZERO previously fixed it at 1. This playback difference is corrected. This is source/file verification, not an audible listening comparison; a different intended CHARIA sample has not been established.

Validation: TypeScript/build, complete housing client/server collision parity and 12 reachable entrances, vacant/retired entry rejection, existing ownership and friend/guild permission tests, warehouse server conservation/isolation tests, pointer lifecycle tests, mocked silent audio route/pitch tests, 808 original-weapon rig pose checks. Browser tests use mute=1/noAudio.
