import '@mantine/core/styles.layer.css';
import '@fontsource/unbounded/600.css';
import '@fontsource/unbounded/700.css';
import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/600.css';
import '@fontsource/rubik/700.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';
import addonDocs from '@storybook/addon-docs';
import { definePreview } from '@storybook/react-vite';
import { layout } from '../src/layout.ts';
import { expectGeometry } from '../src/storybook/geometry.ts';
import {
  frameGlobalType,
  viewportList,
  viewportNames,
  withPhoneFrame,
} from '../src/storybook/PhoneFrame.tsx';
import { apiLoader, withApi } from '../src/storybook/withApi.tsx';
import { withDocsTheme } from '../src/storybook/withDocsTheme.tsx';
import { localeGlobalType, withLocale } from '../src/storybook/withLocale.tsx';

export default definePreview({
  addons: [addonDocs()],
  tags: ['autodocs'],
  globalTypes: { ...localeGlobalType, ...frameGlobalType },
  initialGlobals: {
    locale: 'ru',
    frame: 'narrow',
    viewport: { value: 'narrow', isRotated: false },
  },
  parameters: {
    viewport: {
      options: Object.fromEntries(
        viewportList.map((value) => [
          value,
          {
            name: `${viewportNames[value]} ${layout.viewports[value].width}`,
            styles: {
              width: `${layout.viewports[value].width}px`,
              height: `${layout.viewports[value].height}px`,
            },
            type: value === 'desktop' ? ('desktop' as const) : ('mobile' as const),
          },
        ]),
      ),
    },
    docs: { story: { autoplay: false } },
    layout: 'fullscreen',
    motion: 'off',
    phoneFrame: false,
  },
  loaders: [apiLoader],
  decorators: [withDocsTheme, withPhoneFrame, withLocale, withApi],
  afterEach: async ({ canvasElement, parameters }) => {
    await expectGeometry(canvasElement, parameters.geometry);
  },
});
