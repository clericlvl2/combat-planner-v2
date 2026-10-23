import { describe, expect, it } from 'vite-plus/test';
import { latestTag, nextVersion, parseCommit, parseLog, renderNotes } from './release.mjs';

const sha = (digit) => digit.repeat(40);
const commit = (subject, body = '', hash = sha('a')) => parseCommit({ hash, subject, body });

describe('parseCommit', () => {
  it('reads type, scope and subject', () => {
    expect(commit('fix(api): a combat admits at most 12 players')).toEqual({
      hash: sha('a'),
      type: 'fix',
      scope: 'api',
      subject: 'a combat admits at most 12 players',
      breaking: false,
    });
  });

  it('reads a commit without a scope', () => {
    expect(commit('feat: players see the round')).toMatchObject({
      type: 'feat',
      scope: null,
      subject: 'players see the round',
    });
  });

  it('marks a bang as breaking', () => {
    expect(commit('feat(api)!: links change format')).toMatchObject({
      type: 'feat',
      scope: 'api',
      breaking: true,
    });
  });

  it('marks a BREAKING CHANGE footer as breaking', () => {
    expect(
      commit(
        'fix(api): links change format',
        'Details.\n\nBREAKING CHANGE: old links stop working',
      ),
    ).toMatchObject({ type: 'fix', breaking: true });
  });

  it('ignores a non-conventional subject', () => {
    expect(commit('Merge pull request #5 from clericlvl2/dev')).toBeNull();
    expect(commit('Revert "feat: something"')).toBeNull();
  });
});

describe('nextVersion', () => {
  const fix = commit('fix: a');
  const feat = commit('feat: b');
  const breaking = commit('feat!: c');
  const docs = commit('docs: d');

  it('bumps patch for a fix', () => {
    expect(nextVersion('0.1.2', [fix, docs])).toBe('0.1.3');
  });

  it('bumps minor for a feat', () => {
    expect(nextVersion('0.1.2', [fix, feat])).toBe('0.2.0');
    expect(nextVersion('1.4.2', [feat])).toBe('1.5.0');
  });

  it('bumps major for a breaking change, also before 1.0', () => {
    expect(nextVersion('0.1.2', [fix, breaking])).toBe('1.0.0');
  });

  it('takes an explicit bump over the computed one', () => {
    expect(nextVersion('0.1.2', [feat], 'patch')).toBe('0.1.3');
    expect(nextVersion('0.1.2', [fix], 'major')).toBe('1.0.0');
  });

  it('refuses when nothing is releasable', () => {
    expect(() => nextVersion('0.1.2', [docs])).toThrow(/nothing to release/);
    expect(() => nextVersion('0.1.2', [], 'patch')).toThrow(/nothing to release/);
  });

  it('refuses an unknown bump', () => {
    expect(() => nextVersion('0.1.2', [fix], 'huge')).toThrow(/unknown bump/);
  });
});

describe('renderNotes', () => {
  it('orders sections, leaves hidden types out and links commits', () => {
    const notes = renderNotes('0.2.0', '2026-10-23', [
      commit('revert: undo the toast', '', sha('1')),
      commit('perf(ui): the list scrolls smoothly', '', sha('2')),
      commit('docs: releases are cut from the Actions tab', '', sha('3')),
      commit('fix(api): a combat admits at most 12 players', '', sha('4')),
      commit('feat: players see the round', '', sha('5')),
    ]);
    const url = 'https://github.com/clericlvl2/combat-planner-v2/commit';
    expect(notes).toBe(
      [
        '## 0.2.0 (2026-10-23)',
        '',
        '### Features',
        '',
        `* players see the round ([5555555](${url}/${sha('5')}))`,
        '',
        '### Bug Fixes',
        '',
        `* **api:** a combat admits at most 12 players ([4444444](${url}/${sha('4')}))`,
        '',
        '### Performance',
        '',
        `* **ui:** the list scrolls smoothly ([2222222](${url}/${sha('2')}))`,
        '',
        '### Reverts',
        '',
        `* undo the toast ([1111111](${url}/${sha('1')}))`,
        '',
      ].join('\n'),
    );
  });
});

describe('latestTag', () => {
  it('picks the highest semver tag', () => {
    expect(latestTag(['v0.1.0', 'v0.10.0', 'v0.9.3', 'phase-1', 'v1.0.0-rc.1', ''])).toBe(
      'v0.10.0',
    );
    expect(latestTag(['phase-1'])).toBeNull();
  });
});

describe('parseLog', () => {
  it('splits records and fields', () => {
    expect(
      parseLog(`${sha('a')}\x1ffix: a\x1fbody\n\x1e\n${sha('b')}\x1ffeat: b\x1f\x1e\n`),
    ).toEqual([
      { hash: sha('a'), subject: 'fix: a', body: 'body\n' },
      { hash: sha('b'), subject: 'feat: b', body: '' },
    ]);
  });
});
