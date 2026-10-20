import type { Decorator } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import { layout } from '../layout.ts';
import type { Viewport } from '../layout.ts';
import classes from './PhoneFrame.module.css';

export interface PhoneFrameProps {
  children: ReactNode;
  overlay?: boolean;
  docs?: boolean;
  viewport?: Viewport;
}

export interface PhoneFrameParameter {
  overlay?: boolean;
}

const viewportNames: Record<Viewport, string> = {
  narrow: 'Narrow',
  phone: 'Phone',
  desktop: 'Desktop',
};

const viewportList = Object.keys(viewportNames) as Viewport[];

export const frameGlobalType = {
  frame: {
    description: 'Phone frame width',
    toolbar: {
      title: 'Frame',
      icon: 'mobile' as const,
      items: viewportList.map((value) => ({
        value,
        title: `${viewportNames[value]} ${layout.viewports[value].width}×${layout.viewports[value].height}`,
      })),
      dynamicTitle: true,
    },
  },
};

function isViewport(value: unknown): value is Viewport {
  return viewportList.some((viewport) => viewport === value);
}

export function frameViewportOf(frame: unknown): Viewport {
  return isViewport(frame) ? frame : 'phone';
}

function phoneStyle(viewport: Viewport): CSSProperties {
  return {
    width: layout.viewports[viewport].width,
    height: layout.viewports[viewport].height,
    '--cp-layout-status-bar': `${layout.statusBar}px`,
    '--cp-layout-viewport-width': `${layout.viewports[viewport].width}px`,
  } as CSSProperties;
}

export function PhoneFrame({
  children,
  overlay = false,
  docs = false,
  viewport = 'phone',
}: PhoneFrameProps) {
  return (
    <div
      className={classes.phone}
      data-phone-frame=""
      data-overlay={overlay || undefined}
      data-docs={docs || undefined}
      style={phoneStyle(viewport)}
    >
      <div className={classes.statusBar} style={{ height: layout.statusBar }} aria-hidden="true">
        9:41
      </div>
      <div className={classes.screen}>{children}</div>
    </div>
  );
}

export interface StoryCanvasProps {
  children: ReactNode;
}

export function StoryCanvas({ children }: StoryCanvasProps) {
  return (
    <div className={classes.canvas} data-story-canvas="">
      {children}
    </div>
  );
}

function phoneFrameOf(value: unknown): PhoneFrameParameter | null {
  if (value === true) return {};
  if (typeof value === 'object' && value !== null) return value as PhoneFrameParameter;
  return null;
}

export const withPhoneFrame: Decorator = (Story, { globals, parameters, viewMode }) => {
  const phoneFrame = phoneFrameOf(parameters.phoneFrame);
  return phoneFrame ? (
    <PhoneFrame
      overlay={phoneFrame.overlay === true}
      docs={viewMode === 'docs'}
      viewport={frameViewportOf(globals.frame)}
    >
      <Story />
    </PhoneFrame>
  ) : (
    <StoryCanvas>
      <Story />
    </StoryCanvas>
  );
};
