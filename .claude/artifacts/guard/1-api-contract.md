# Guard: 1-api-contract

Range 794d3f0..5395d7a, guard-bee Fable 5.1 higher, read-only.

CRIT 1 PASS .claude/run/1-api-contract/summary.log:1-27
CRIT 2 PASS packages/api/src/client.ts:237-246
CRIT 3 PASS packages/api/src/index.ts:7-56
CRIT 4 PASS packages/api/src/client.test.ts:199-217
CRIT 5 PASS commit 5395d7a

## Findings

- P1 packages/api/src/client.ts:194-196 No method returns the combat's current link token; `Combat` carries only `linkGeneration`, the token is server-signed, and `link.reissue` releases every claim (vision Share, Claims), so phase 4 cannot show the link without a new method. Inherited from the plan block.
- P1 packages/api/src/client.ts:185-191,202-207 `subscribe` has only `onDocument` and `onEnd`; nothing produces `ConnectionState`, so the 2.4 hooks cannot show «Reconnecting…» (vision Connection, Data flow 13) and `FakeApiClient` stories cannot seed it. Inherited from the plan block.
- P3 packages/api/src/client.ts:100-106 `language` lives only in the `play.get` result; a DM language change mid-session reaches players on refetch only.
- P3 packages/api/src/client.ts:185-191 `combats.subscribe` accepts a player viewer but no token; the player path is `play.subscribe`.

5 pass / 0 fail / 0 unverifiable; scope held.
