import type { Decorator } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import { layout } from '../layout.ts';
import classes from './PhoneFrame.module.css';

export interface PhoneFrameProps {
  children: ReactNode;
  overlay?: boolean;
  docs?: boolean;
}

export interface PhoneFrameParameter {
  overlay?: boolean;
}

const phoneStyle = {
  width: layout.phone.width,
  height: layout.phone.height,
  '--cp-layout-status-bar': `${layout.statusBar}px`,
} as CSSProperties;

export function PhoneFrame({ children, overlay = false, docs = false }: PhoneFrameProps) {
  return (
    <div
      className={classes.phone}
      data-phone-frame=""
      data-overlay={overlay || undefined}
      data-docs={docs || undefined}
      style={phoneStyle}
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

export const withPhoneFrame: Decorator = (Story, { parameters, viewMode }) => {
  const phoneFrame = phoneFrameOf(parameters.phoneFrame);
  return phoneFrame ? (
    <PhoneFrame overlay={phoneFrame.overlay === true} docs={viewMode === 'docs'}>
      <Story />
    </PhoneFrame>
  ) : (
    <StoryCanvas>
      <Story />
    </StoryCanvas>
  );
};
