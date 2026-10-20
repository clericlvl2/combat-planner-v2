import preview from '#.storybook/preview';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'react-qr-code';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { expectNoHorizontalOverflow, expectNotTruncated } from '../../storybook/geometry.ts';
import { ShareSheet } from './ShareSheet.tsx';
import { storyT } from '../../storybook/storyT.ts';

interface ShareSheetCellProps {
  combatTitle?: string;
  url?: string;
  reissuedUrl?: string;
  withOpener?: boolean;
  copyResult?: boolean;
  onCopy?: (url: string) => void;
  onReissue?: () => void;
  onClose?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

const opener: CSSProperties = { position: 'absolute', top: 60, left: 16 };

const linkG3 = 'combat.example/combats/01J9ZQ/play?t=g3.k7Fh2';

const linkG4 = 'combat.example/combats/01J9ZQ/play?t=g4.k7Fh2';

function ShareSheetCell({
  combatTitle = 'Ambush at the Ferry',
  url: initialUrl = linkG3,
  reissuedUrl = linkG4,
  withOpener = false,
  copyResult,
  onCopy,
  onReissue,
  onClose,
}: ShareSheetCellProps) {
  const [url, setUrl] = useState(initialUrl);
  const [opened, setOpened] = useState(true);
  return (
    <div style={stage}>
      {withOpener ? (
        <button type="button" data-story-fixture="" style={opener} onClick={() => setOpened(true)}>
          Share
        </button>
      ) : null}
      <ShareSheet
        opened={opened}
        combatTitle={combatTitle}
        url={url}
        onCopy={(copied) => {
          onCopy?.(copied);
          return copyResult === undefined ? undefined : Promise.resolve(copyResult);
        }}
        onReissue={() => {
          setUrl(reissuedUrl);
          onReissue?.();
        }}
        onClose={() => {
          setOpened(false);
          onClose?.();
        }}
      />
    </div>
  );
}

const openSheetGeometry = {
  truncation: {
    reason: 'the player link ends with an ellipsis by design',
    except: '[data-url]',
  },
};

const meta = preview.meta({
  title: 'Organisms/ShareSheet',
  component: ShareSheetCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { onCopy: fn(), onReissue: fn(), onClose: fn() },
});

const qrPaths = (svg: Element | null) =>
  [...(svg?.querySelectorAll('path') ?? [])].map((path) => path.getAttribute('d'));

const referencePaths = async (value: string) => {
  const host = document.createElement('div');
  const root = createRoot(host);
  root.render(<QRCode value={value} />);
  try {
    return await waitFor(() => {
      const paths = qrPaths(host.querySelector('svg'));
      if (paths.length === 0) throw new Error('reference QR not rendered');
      return paths;
    });
  } finally {
    root.unmount();
  }
};

const expectQrEncodes = async (canvasElement: HTMLElement, value: string) => {
  const rendered = qrPaths(canvasElement.querySelector('[data-qr]'));
  await expect(rendered.length).toBeGreaterThan(0);
  await expect(rendered).toEqual(await referencePaths(value));
};

const restFocusOnSheet = async (sheet: HTMLElement) => {
  sheet.focus();
  await expect(sheet).toHaveFocus();
};

export const Anatomy = meta.story({
  parameters: { geometry: openSheetGeometry },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'ShareSheet');
    await expect(canvas.getByRole('dialog', { name: t('title') })).toBeVisible();
    await expect(canvas.getByText('Ambush at the Ferry')).toBeVisible();
    await expect(canvas.getByRole('img', { name: t('qr') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('copy') })).toBeVisible();
    const reissue = canvas.getByRole('button', { name: t('reissue') });
    await expectNotTruncated(reissue);
    await expectNoHorizontalOverflow(reissue);
  },
});

export const Link = meta.story({
  parameters: { geometry: openSheetGeometry },
  name: 'Link',
  play: async ({ args, canvas, canvasElement }) => {
    const link = canvas.getByText(linkG3);
    await expect(link).toHaveTextContent(linkG3);
    await expect(link.scrollWidth).toBeGreaterThan(link.clientWidth);
    await expect(getComputedStyle(link).textOverflow).toBe('ellipsis');
    await expectQrEncodes(canvasElement, linkG3);
    await userEvent.click(link);
    await expect(args.onCopy).not.toHaveBeenCalled();
    await expect(args.onReissue).not.toHaveBeenCalled();
  },
});

export const LinkCopied = meta.story({
  parameters: { geometry: openSheetGeometry },
  name: 'Link copied',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'ShareSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('copy') }));
    await expect(args.onCopy).toHaveBeenCalledOnce();
    await expect(args.onCopy).toHaveBeenCalledWith(linkG3);
    const copied = canvas.getByRole('button', { name: t('copied') });
    await expect(copied).toHaveAttribute('data-copied');
    await expect(getComputedStyle(copied).backgroundColor).toBe('rgb(46, 122, 67)');
    await expect(args.onReissue).not.toHaveBeenCalled();
    await restFocusOnSheet(canvas.getByRole('dialog'));
  },
});

export const AfterReissueNewLink = meta.story({
  parameters: { geometry: openSheetGeometry },
  name: 'After reissue: new link',
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'ShareSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('reissue') }));
    await expect(args.onReissue).toHaveBeenCalledOnce();
    await expect(args.onReissue).toHaveBeenCalledWith();
    await expect(args.onCopy).not.toHaveBeenCalled();
    await expect(canvas.getByText(linkG4)).toBeVisible();
    await expect(canvas.queryByText(linkG3)).toBeNull();
    await expectQrEncodes(canvasElement, linkG4);
    await restFocusOnSheet(canvas.getByRole('dialog'));
  },
});

export const ExtraFlow = meta.story({
  parameters: { geometry: openSheetGeometry },
  name: 'Flow: tap Copy, then tap Reissue',
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'ShareSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('copy') }));
    await expect(args.onCopy).toHaveBeenLastCalledWith(linkG3);
    await expect(canvas.getByRole('button', { name: t('copied') })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('reissue') }));
    await expect(args.onReissue).toHaveBeenCalledOnce();
    await expect(canvas.getByText(linkG4)).toBeVisible();
    await expectQrEncodes(canvasElement, linkG4);
    const copy = canvas.getByRole('button', { name: t('copy') });
    await expect(copy).not.toHaveAttribute('data-copied');
    await userEvent.click(copy);
    await expect(args.onCopy).toHaveBeenCalledTimes(2);
    await expect(args.onCopy).toHaveBeenLastCalledWith(linkG4);
    await expect(args.onClose).not.toHaveBeenCalled();
  },
});

export const ExtraCopyFails = meta.story({
  parameters: { geometry: openSheetGeometry },
  name: 'A failed copy does not show Copied',
  args: { copyResult: false },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'ShareSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('copy') }));
    await expect(args.onCopy).toHaveBeenCalledWith(linkG3);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(canvas.queryByRole('button', { name: t('copied') })).toBeNull();
    await expect(canvas.getByRole('button', { name: t('copy') })).not.toHaveAttribute(
      'data-copied',
    );
  },
});

export const ExtraCopyResolves = meta.story({
  parameters: { geometry: openSheetGeometry },
  name: 'A successful async copy shows Copied',
  args: { copyResult: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'ShareSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('copy') }));
    await expect(args.onCopy).toHaveBeenCalledWith(linkG3);
    await expect(await canvas.findByRole('button', { name: t('copied') })).toHaveAttribute(
      'data-copied',
    );
    await restFocusOnSheet(canvas.getByRole('dialog'));
  },
});

export const ExtraQrEncodesUrl = meta.story({
  parameters: { geometry: openSheetGeometry },
  name: 'The QR encodes exactly the url',
  args: { url: 'https://combat.example/combats/01J9ZQ/play?t=g12.Zx9' },
  play: async ({ canvasElement }) => {
    await expectQrEncodes(canvasElement, 'https://combat.example/combats/01J9ZQ/play?t=g12.Zx9');
    const rendered = qrPaths(canvasElement.querySelector('[data-qr]'));
    await expect(rendered).not.toEqual(
      await referencePaths('https://combat.example/combats/01J9ZQ/play?t=g12.Zx8'),
    );
    await expect(rendered).not.toEqual(await referencePaths(linkG3));
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter copies, Space reissues, Escape closes',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'ShareSheet');
    const sheet = canvas.getByRole('dialog', { name: t('title') });
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    canvas.getByRole('button', { name: t('copy') }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onCopy).toHaveBeenCalledOnce();
    await expect(args.onCopy).toHaveBeenCalledWith(linkG3);
    await expect(canvas.getByRole('button', { name: t('copied') })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: t('reissue') })).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(args.onReissue).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onCopy).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraShiftTab = meta.story({
  parameters: { geometry: openSheetGeometry },
  name: 'Shift+Tab right after opening stays inside',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'ShareSheet');
    const sheet = canvas.getByRole('dialog', { name: t('title') });
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    await userEvent.tab({ shift: true });
    await expect(sheet).toContainElement(document.activeElement as HTMLElement);
    await expect(canvas.getByRole('button', { name: t('reissue') })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: t('Sheet:close') })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: t('copy') })).toHaveFocus();
  },
});

export const ExtraShiftTabMotionOn = meta.story({
  name: 'Shift+Tab with motion on stays inside, Escape closes',
  parameters: { motion: 'on' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'ShareSheet');
    const sheet = await canvas.findByRole('dialog', { name: t('title') });
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    await userEvent.tab({ shift: true });
    await expect(sheet).toContainElement(document.activeElement as HTMLElement);
    await userEvent.tab();
    await expect(sheet).toContainElement(document.activeElement as HTMLElement);
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onCopy).not.toHaveBeenCalled();
    await expect(args.onReissue).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraClose = meta.story({
  name: 'Close button calls onClose only',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'ShareSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:close') }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onCopy).not.toHaveBeenCalled();
    await expect(args.onReissue).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraReopenResetsCopied = meta.story({
  name: 'Reopening shows Copy again',
  parameters: {
    geometry: {
      ...openSheetGeometry,
      tapTargets: {
        reason: 'the Share opener is a story fixture, not product UI',
        except: '[data-story-fixture]',
      },
    },
  },
  args: { withOpener: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'ShareSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('copy') }));
    await expect(canvas.getByRole('button', { name: t('copied') })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:close') }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await userEvent.click(canvas.getByRole('button', { name: 'Share' }));
    await expect(await canvas.findByRole('button', { name: t('copy') })).not.toHaveAttribute(
      'data-copied',
    );
    await expect(args.onCopy).toHaveBeenCalledOnce();
  },
});

export const ExtraLocaleRu = meta.story({
  parameters: { geometry: openSheetGeometry },
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { combatTitle: 'Засада у переправы' },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Поделиться с игроками' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Копировать' }));
    await expect(args.onCopy).toHaveBeenCalledWith(linkG3);
    await expect(canvas.getByRole('button', { name: 'Скопировано' })).toBeVisible();
    const reissue = canvas.getByRole('button', { name: 'Перевыпустить ссылку' });
    await expectNotTruncated(reissue);
    await expectNoHorizontalOverflow(reissue);
    await restFocusOnSheet(canvas.getByRole('dialog'));
  },
});

export const ExtraLocaleDe = meta.story({
  parameters: { geometry: openSheetGeometry },
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { combatTitle: 'Hinterhalt an der Fähre' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Mit Spielern teilen' })).toBeVisible();
    const reissue = canvas.getByRole('button', { name: 'Link neu ausstellen' });
    await expectNotTruncated(reissue);
    await expectNoHorizontalOverflow(reissue);
    await expect(canvas.getByRole('button', { name: 'Kopieren' })).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  parameters: { geometry: openSheetGeometry },
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { combatTitle: 'フェリーでの待ち伏せ' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'プレイヤーと共有' })).toBeVisible();
    const reissue = canvas.getByRole('button', { name: 'リンクを再発行' });
    await expectNotTruncated(reissue);
    await expectNoHorizontalOverflow(reissue);
    await expect(canvas.getByRole('button', { name: 'コピー' })).toBeVisible();
  },
});
