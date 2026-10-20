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
import { frameGlobalType, withPhoneFrame } from '../src/storybook/PhoneFrame.tsx';
import { apiLoader, withApi } from '../src/storybook/withApi.tsx';
import { withDocsTheme } from '../src/storybook/withDocsTheme.tsx';
import { localeGlobalType, withLocale } from '../src/storybook/withLocale.tsx';

export default definePreview({
  addons: [addonDocs()],
  tags: ['autodocs'],
  globalTypes: { ...localeGlobalType, ...frameGlobalType },
  initialGlobals: { locale: 'en', frame: 'phone', viewport: { value: 'phone', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        phone: {
          name: `Phone ${layout.phone.width}`,
          styles: { width: `${layout.phone.width}px`, height: `${layout.phone.height}px` },
          type: 'mobile',
        },
      },
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
