# Arm attachment and house resale

The idle dagger's elbow previously bent almost eight art units outside its shoulder, while atlas cells placed the torso off-center. Register each painted body beneath its head, cap lateral elbow bend, narrow sleeve/glove layers, lower idle hands, and order rear hands behind the body. Original weapon artwork and combat timing remain unchanged.

House owners can sell their active character's house at the housing kiosk for 70% of the recorded purchase price. The UI shows the amount and requires a second click to confirm. The server verifies character ownership and proximity, serializes sales with other world mutations, computes the refund independently, preserves an audit record, ejects visitors, and releases the house. A second sale fails without crediting gold. Future owners cannot see the previous ownership's house chat or inherit its permissions.

Migration: `202611210008_online_house_resale.sql`. Existing ownerships receive their unchanged catalog purchase price; new purchases record the server catalog price via trigger. No real player house was sold during verification.

Validation: TypeScript/build, 808 rig pose checks, 18-outfit/vertical continuity checks, existing housing regression suite, hair persistence suite, and dedicated resale tests for authorization, distance, forged refund, duplicate sale, original purchase price, visitor ejection, rebuy, permissions, private chat and RLS. Silent actual-town browser checks cover shield-free idle/attack and the resale confirmation/results UI using local fixtures. QA pages are excluded from public build inputs.
