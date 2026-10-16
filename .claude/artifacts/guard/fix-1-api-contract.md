# Guard: fix-1-api-contract

Range 79100fa..5d06366, guard-bee Fable 5.1 higher, read-only.

CRIT 1 PASS .claude/run/fix-1-api-contract/summary.log:1-13
CRIT 2 PASS packages/api/src/client.ts:86-92,181-186,204,207-210,248-249
CRIT 3 PASS packages/api/src/client.test.ts:209,251-269; packages/api/src/index.ts:14-50
CRIT 4 PASS commit 5d06366

Previous guard P1s both closed (`link.get` at client.ts:207-208; `connection.state/subscribe` at :183-186, 249).

## Findings

- P3 packages/api/src/client.ts:92 Type name `Link` may collide with a router or UI `Link` once phase 2/4 imports both.
- P3 packages/api/src/client.ts:96-99 `LinkReissueResult` is `{ token, version }` while `Link` is `{ token, generation }`; a Share screen reads the new generation from `link.get` or the SSE document.
- P3 packages/api/src/client.test.ts:57-58,113-121 The memory client never emits a connection transition; deferred to the 2.4 `FakeApiClient`.

4 pass / 0 fail / 0 unverifiable; scope held.
