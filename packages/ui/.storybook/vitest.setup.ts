import { page } from 'vite-plus/test/browser';
import { setResizeTestPage } from '../src/storybook/frameViewport.ts';

setResizeTestPage(async (width, height) => {
  await page.viewport(width, height);
});
