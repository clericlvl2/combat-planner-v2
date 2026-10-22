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

export const Default = meta.story({
  tags: ['visual'],
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

export const LinkCopied = meta.story({
  tags: ['visual'],
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

export const LongCombatTitle = meta.story({
  args: { combatTitle: 'Засада у переправы через Чёрную реку на рассвете второго дня' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'ShareSheet');
    await expect(canvas.getByRole('dialog', { name: t('title') })).toBeVisible();
    await expect(
      canvas.getByText('Засада у переправы через Чёрную реку на рассвете второго дня'),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('copy') })).toBeVisible();
  },
});

export const LinkEllipsisAndQr = meta.story({
  tags: ['!dev'],
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

export const AfterReissueNewLink = meta.story({
  tags: ['!dev'],
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

export const FailedCopyKeepsCopy = meta.story({
  tags: ['!dev'],
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

export const AsyncCopyShowsCopied = meta.story({
  tags: ['!dev'],
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

export const ReopenResetsCopied = meta.story({
  tags: ['!dev'],
  parameters: {
    geometry: {
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
