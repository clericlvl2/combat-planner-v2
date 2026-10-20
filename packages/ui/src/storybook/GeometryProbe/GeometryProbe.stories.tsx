import preview from '#.storybook/preview';
import type { CSSProperties } from 'react';
import { expect } from 'storybook/test';
import { brokenWords, hiddenSheetActions, thinScrims } from '../geometry.ts';

const meta = preview.meta({
  title: 'Storybook/GeometryProbe',
  parameters: { phoneFrame: true },
});

const probeText: CSSProperties = { margin: 12, fontSize: 16, overflowWrap: 'anywhere' };

const actionButton: CSSProperties = { width: '100%', minHeight: 48, fontSize: 16 };

export const ExtraWordBreaks = meta.story({
  name: 'A Latin or Cyrillic word split across lines fails wordBreaks',
  parameters: { geometry: { wordBreaks: 'the probe splits a word on purpose' } },
  render: () => (
    <div>
      <p data-testid="broken" style={{ ...probeText, width: 40 }}>
        Berserker
      </p>
      <p
        data-testid="hyphen"
        style={{ ...probeText, width: 'min-content', overflowWrap: 'normal' }}
      >
        Орк-берсерк
      </p>
      <p data-testid="cjk" style={{ ...probeText, width: 40 }}>
        渡し守と大蛇
      </p>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const lines = (testId: string) => {
      const box = canvas.getByTestId(testId);
      return Math.round(
        box.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(box).lineHeight),
      );
    };
    await expect(lines('hyphen')).toBe(2);
    await expect(lines('cjk')).toBeGreaterThanOrEqual(2);
    const findings = brokenWords(canvasElement);
    await expect(findings.map((finding) => finding.replace(/^.* breaks /, ''))).toEqual([
      '"Berserker" across 2 lines',
    ]);
  },
});

export const ExtraWordBreaksTightLines = meta.story({
  name: 'A word split across lines at line-height 1 fails wordBreaks',
  parameters: { geometry: { wordBreaks: 'the probe splits a word on purpose' } },
  render: () => (
    <p
      data-testid="tight"
      style={{ ...probeText, width: 40, lineHeight: 1, fontFamily: "'Rubik', sans-serif" }}
    >
      Berserker
    </p>
  ),
  play: async ({ canvas, canvasElement }) => {
    const box = canvas.getByTestId('tight');
    const style = getComputedStyle(box);
    await expect(style.fontFamily).toContain('Rubik');
    await document.fonts.ready;
    await expect(document.fonts.check('16px Rubik')).toBe(true);
    await expect(Number.parseFloat(style.lineHeight)).toBe(Number.parseFloat(style.fontSize));
    await expect(box.getBoundingClientRect().height).toBeGreaterThanOrEqual(
      2 * Number.parseFloat(style.lineHeight),
    );
    const findings = brokenWords(canvasElement);
    await expect(findings).toHaveLength(1);
    await expect(findings[0]).toMatch(/breaks "Berserker" across [2-9] lines$/);
  },
});

export const ExtraSoftHyphen = meta.story({
  name: 'A word broken at a soft hyphen passes wordBreaks',
  render: () => (
    <p data-testid="soft" style={{ ...probeText, width: 58, fontSize: 11, lineHeight: 1 }}>
      {'Verbün\u00addeter'}
    </p>
  ),
  play: async ({ canvas, canvasElement }) => {
    const box = canvas.getByTestId('soft');
    const lineHeight = Number.parseFloat(getComputedStyle(box).lineHeight);
    await expect(Math.round(box.getBoundingClientRect().height / lineHeight)).toBe(2);
    await expect(brokenWords(canvasElement)).toEqual([]);
  },
});

export const ExtraActionsVisible = meta.story({
  name: 'A sheet action below the scroll edge fails actionsVisible',
  parameters: { geometry: { actionsVisible: 'the probe hides a sheet action on purpose' } },
  render: () => (
    <section style={{ margin: 12, height: 240, overflow: 'hidden' }}>
      <div data-sheet-content="" style={{ height: 240, overflowY: 'auto' }}>
        <button type="button" data-sheet-action="" style={actionButton}>
          Shown action
        </button>
        <div style={{ height: 400 }} />
        <button type="button" data-sheet-action="" style={actionButton}>
          Hidden action
        </button>
      </div>
    </section>
  ),
  play: async ({ canvasElement }) => {
    const findings = hiddenSheetActions(canvasElement);
    await expect(findings).toHaveLength(1);
    await expect(findings[0]).toContain('"Hidden action"');
  },
});

export const ExtraScrimTarget = meta.story({
  name: 'A drawer scrim strip under 44 px fails scrimTarget',
  parameters: { geometry: { scrimTarget: 'the probe leaves a 20 px scrim on purpose' } },
  render: () => (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div data-scrim="" style={{ position: 'fixed', inset: 0, background: '#0008' }} />
      <div
        data-drawer=""
        style={{ position: 'fixed', top: 0, bottom: 0, left: 0, right: 20, background: '#fff' }}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const findings = thinScrims(canvasElement);
    await expect(findings).toHaveLength(1);
    await expect(findings[0]).toContain('leaves a 20 px strip');
  },
});
