# Rear station and realtime corrections — 2026-11-26

The original south entrance remains at (49–50, 24), with the existing two-key requirement. The old station obstructed the client approach at (53, 26); server collision also differed from client turnstile collision. Restore the original maze corridor. Move the station to an exterior footprint (90–104, 3–20), with a northern rear passage into the same arena at (54–55, 2). Both arena exits seal during opening, battle and returning. Existing room progress, accounts and equipment remain; characters standing on removed solid geometry move to a nearby free corridor square.

Fast walking now respects locked stations, stops its buffered path on a boarding square, charges one 500G fare, and includes own travel/gold state in sparse updates. The real scene demo entered the boss scene through both entrances using keyboard input, muted. The station was visually inspected in the real Phaser scene.

Two more interruption causes were reproduced and corrected: an empty enemy array became JSON null after idle/resume, and the fast movement cinematic guard paused players outside the boss arena. Mandatory cinematic locks remain inside the arena. Redundant combat polls are skipped immediately after movement acknowledgements; idle combat polling uses 160ms rather than 120ms.

Validation: test-rear-station.mjs, test-realtime-edge-cases.mjs, test-fast-motion.mjs, test-fast-motion-client.mjs, test-frame-grid.mjs, test-production-realtime.mjs, test-boss-cinematics.mjs, test-combat-pulse.mjs; TypeScript boss stage/railway map tests; production build. No test sound was enabled.

Actual PostgreSQL 16 on an isolated loopback test cluster: user and room locks were each held in a separate session for 1.2 seconds. The movement request deferred immediately; the actual client retry loop recovered the unchanged input (8 attempts, 1.297 seconds, one accepted square). Four player connections then ran 72 walks alongside 140 combat pulses and 16 full metadata polls: 36 deferred retries, movement p50 73ms / p95 375ms / max 583ms, no lock timeout or deadlock. These include Windows psql process startup and local contention; they are not production network latency promises. An initial run exposed the empty-array failure above and was rerun successfully after correction.

Production SQL verification returned true for scoped cinematic guards, safe empty-room aggregation, and both unlocked entrances. Supabase migrations 202611260001–3 were applied; browser release must match these coordinates.

## Publication hold (latest operational state)

Pages build/upload succeeded twice, but GitHub refused deployment creation with HTTP 500 on runs 45649621088 and 45649946045. CLI failed-job/full reruns also returned 500; the connected GitHub rerun tools timed out / returned an internal error. The official status page showed operational, so this is not asserted to be a confirmed platform-wide outage. No settings or domain changes were made.

The live browser still reports source 4746ea41d879fcc971555899e0aa43418cca8494 (first lock-contention hotfix). To avoid mismatched old client/new geometry, **only floor1 config and online_world_pre_latency were restored to that published layout**. Confirmed station_x=48. The nonblocking motion fix, scoped arena cinematic fix and empty-room fix remain applied. Rear collision guard is harmless on the old wall; the fast boarding code reads whichever station config is active.

The rear-station browser build remains on gh-pages commit d98c2d07b98619c718f7cfc581e6951ce479dd36 (source cf6c986). Once that deployment succeeds and its release metadata is live, run `node scripts/prepare-rear-station-publication.mjs` to recreate `tmp/resume-rear-station.sql`, then apply that authored SQL in Supabase. This restores only the prepared new geometry and matching railway wrapper; **do not rerun migration 202611260002**, whose other function patches are already installed. Recheck station_x=90 and both entrances after publication.

Additional passing validation: dense real-PostgreSQL test with 12 active mobs and 4 players, 88 movement requests plus combat pulses: p50 203ms, p95 643ms, max 877ms, 104 deferred retries, no timeout/deadlock. 74 collision stops were ordinary occupied-cell/root effects in the crowded fixture. Muted actual Phaser render sample: 16 seconds, 48 enemy states, 493 scene objects, frame p95 5.9ms, scene-update p95 0.4ms; no growing object count or visible freeze in that sample. This does not replace observation on the user's production connection.

## Publication completed — 2026-11-27

The previous hold is resolved. Fresh Pages run 45925397983 succeeded, publishing gh-pages 8d8fc162fb3272979204c7913040e56e80d8bfdf. The live release endpoint reports source 9311a34d233cb1eca927821ebd412662ae008622 and builtAt 2026-11-27T01:56:14.671Z. The prepared resume SQL was then applied to restore the exterior rear-station geometry and matching railway wrapper. Production query confirmed `結晶門・裏口駅`, station_x=90, front_open=true, rear_open=true. A second query confirmed all four flags true: nonblocking_motion, cinematic_scoped, empty_room_safe, railway_arrival_updated. The old publication-hold instructions above are historical; no hold remains.
