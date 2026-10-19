# Brief: fix-11-i18n-review

Batch `fix-11-i18n-review`, done by the orchestrator. Rules: `CLAUDE.md`.

## Scope

Apply the proofreading findings for de, es, fr, ja and ru in
`packages/ui/src/i18n/<lng>/*.json`, terminology of 13th Age where it exists.
Keys whose value now equals en are added to
`packages/ui/src/i18n/allow-same.txt`. Baselines of stories rendered in a
changed locale are regenerated.

## Units, one commit each

1. `de translations`
2. `es translations`
3. `fr translations`
4. `ja translations`
5. `ru translations`

`check-commit` path scope is red for these units: every unit touches i18n
files of many components by design.

## Acceptance

1. `check-i18n` green.
2. `gate` green apart from the `check-commit` path scope above.
