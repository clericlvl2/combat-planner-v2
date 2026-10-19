import { MantineThemeProvider } from '@mantine/core';
import type { MantineThemeOverride } from '@mantine/core';
import type { Decorator } from '@storybook/react-vite';

export const docsTheme: MantineThemeOverride = {
  components: {
    ModalRoot: { defaultProps: { lockScroll: false, trapFocus: false, returnFocus: false } },
    Popover: { defaultProps: { withinPortal: false } },
  },
};

export const withDocsTheme: Decorator = (Story, { viewMode }) =>
  viewMode === 'docs' ? (
    <MantineThemeProvider theme={docsTheme}>
      <Story />
    </MantineThemeProvider>
  ) : (
    <Story />
  );
