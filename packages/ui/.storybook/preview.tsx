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
import { withPhoneFrame } from '../src/storybook/PhoneFrame.tsx';
import { localeGlobalType, withLocale } from '../src/storybook/withLocale.tsx';

export default definePreview({
  addons: [addonDocs()],
  globalTypes: localeGlobalType,
  initialGlobals: { locale: 'en' },
  parameters: {
    layout: 'fullscreen',
    motion: 'off',
    phoneFrame: false,
  },
  decorators: [withPhoneFrame, withLocale],
});
