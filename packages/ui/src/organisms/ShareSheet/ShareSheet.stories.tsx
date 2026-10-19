import preview from '#.storybook/preview';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'react-qr-code';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { ShareSheet } from './ShareSheet.tsx';

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
        <button type="button" style={opener} onClick={() => setOpened(true)}>
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

const expectFits = async (button: HTMLElement) => {
  const label = button.querySelector('span') ?? button;
  await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
  await expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
};

export const Anatomy = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Share with players' })).toBeVisible();
    await expect(canvas.getByText('Ambush at the Ferry')).toBeVisible();
    await expect(canvas.getByRole('img', { name: 'QR code of the player link' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Copy' })).toBeVisible();
    await expectFits(canvas.getByRole('button', { name: 'Revoke and reissue link' }));
  },
});

export const Link = meta.story({
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
  name: 'Link copied',
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Copy' }));
    await expect(args.onCopy).toHaveBeenCalledOnce();
    await expect(args.onCopy).toHaveBeenCalledWith(linkG3);
    const copied = canvas.getByRole('button', { name: 'Copied' });
    await expect(copied).toHaveAttribute('data-copied');
    await expect(getComputedStyle(copied).backgroundColor).toBe('rgb(46, 122, 67)');
    await expect(args.onReissue).not.toHaveBeenCalled();
    await restFocusOnSheet(canvas.getByRole('dialog'));
  },
});

export const AfterReissueNewLink = meta.story({
  name: 'After reissue: new link',
  play: async ({ args, canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Revoke and reissue link' }));
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
  name: 'Flow: tap Copy, then tap Reissue',
  play: async ({ args, canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Copy' }));
    await expect(args.onCopy).toHaveBeenLastCalledWith(linkG3);
    await expect(canvas.getByRole('button', { name: 'Copied' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Revoke and reissue link' }));
    await expect(args.onReissue).toHaveBeenCalledOnce();
    await expect(canvas.getByText(linkG4)).toBeVisible();
    await expectQrEncodes(canvasElement, linkG4);
    const copy = canvas.getByRole('button', { name: 'Copy' });
    await expect(copy).not.toHaveAttribute('data-copied');
    await userEvent.click(copy);
    await expect(args.onCopy).toHaveBeenCalledTimes(2);
    await expect(args.onCopy).toHaveBeenLastCalledWith(linkG4);
    await expect(args.onClose).not.toHaveBeenCalled();
  },
});

export const ExtraCopyFails = meta.story({
  name: 'A failed copy does not show Copied',
  args: { copyResult: false },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Copy' }));
    await expect(args.onCopy).toHaveBeenCalledWith(linkG3);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(canvas.queryByRole('button', { name: 'Copied' })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Copy' })).not.toHaveAttribute('data-copied');
  },
});

export const ExtraCopyResolves = meta.story({
  name: 'A successful async copy shows Copied',
  args: { copyResult: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Copy' }));
    await expect(args.onCopy).toHaveBeenCalledWith(linkG3);
    await expect(await canvas.findByRole('button', { name: 'Copied' })).toHaveAttribute(
      'data-copied',
    );
    await restFocusOnSheet(canvas.getByRole('dialog'));
  },
});

export const ExtraQrEncodesUrl = meta.story({
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
  play: async ({ args, canvas }) => {
    const sheet = canvas.getByRole('dialog', { name: 'Share with players' });
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    canvas.getByRole('button', { name: 'Copy' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onCopy).toHaveBeenCalledOnce();
    await expect(args.onCopy).toHaveBeenCalledWith(linkG3);
    await expect(canvas.getByRole('button', { name: 'Copied' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Revoke and reissue link' })).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(args.onReissue).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onCopy).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraShiftTab = meta.story({
  name: 'Shift+Tab right after opening stays inside',
  play: async ({ canvas }) => {
    const sheet = canvas.getByRole('dialog', { name: 'Share with players' });
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    await userEvent.tab({ shift: true });
    await expect(sheet).toContainElement(document.activeElement as HTMLElement);
    await expect(canvas.getByRole('button', { name: 'Revoke and reissue link' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Copy' })).toHaveFocus();
  },
});

export const ExtraShiftTabMotionOn = meta.story({
  name: 'Shift+Tab with motion on stays inside, Escape closes',
  parameters: { motion: 'on' },
  play: async ({ args, canvas }) => {
    const sheet = await canvas.findByRole('dialog', { name: 'Share with players' });
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
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onCopy).not.toHaveBeenCalled();
    await expect(args.onReissue).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraReopenResetsCopied = meta.story({
  name: 'Reopening shows Copy again',
  args: { withOpener: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Copy' }));
    await expect(canvas.getByRole('button', { name: 'Copied' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await userEvent.click(canvas.getByRole('button', { name: 'Share' }));
    await expect(await canvas.findByRole('button', { name: 'Copy' })).not.toHaveAttribute(
      'data-copied',
    );
    await expect(args.onCopy).toHaveBeenCalledOnce();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { combatTitle: 'Засада у переправы' },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Поделиться с игроками' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Копировать' }));
    await expect(args.onCopy).toHaveBeenCalledWith(linkG3);
    await expect(canvas.getByRole('button', { name: 'Скопировано' })).toBeVisible();
    await expectFits(canvas.getByRole('button', { name: 'Перевыпустить ссылку' }));
    await restFocusOnSheet(canvas.getByRole('dialog'));
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { combatTitle: 'Hinterhalt an der Fähre' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Mit Spielern teilen' })).toBeVisible();
    await expectFits(canvas.getByRole('button', { name: 'Link neu ausstellen' }));
    await expect(canvas.getByRole('button', { name: 'Kopieren' })).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { combatTitle: 'フェリーでの待ち伏せ' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'プレイヤーと共有' })).toBeVisible();
    await expectFits(canvas.getByRole('button', { name: 'リンクを再発行' }));
    await expect(canvas.getByRole('button', { name: 'コピー' })).toBeVisible();
  },
});
