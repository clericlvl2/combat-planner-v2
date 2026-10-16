import type { Decorator } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { layout } from '../layout.ts';
import classes from './PhoneFrame.module.css';

export interface PhoneFrameProps {
  children: ReactNode;
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div
      className={classes.phone}
      data-phone-frame=""
      style={{ width: layout.phone.width, height: layout.phone.height }}
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

export const withPhoneFrame: Decorator = (Story, { parameters }) =>
  parameters.phoneFrame === true ? (
    <PhoneFrame>
      <Story />
    </PhoneFrame>
  ) : (
    <StoryCanvas>
      <Story />
    </StoryCanvas>
  );
