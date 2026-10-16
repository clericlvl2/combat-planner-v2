/// <reference types="vite-plus/client" />
import '@mantine/core/styles.layer.css';
import { MantineProvider } from '@mantine/core';
import addonDocs from '@storybook/addon-docs';
import { definePreview } from '@storybook/react-vite';

export default definePreview({
  addons: [addonDocs()],
  decorators: [
    (Story) => (
      <MantineProvider>
        <Story />
      </MantineProvider>
    ),
  ],
});
