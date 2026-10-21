import { isStory } from 'storybook/internal/csf';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { layout } from '../src/layout.ts';

const storyModules = import.meta.glob<Record<string, unknown>>('../src/**/*.stories.tsx', {
  eager: true,
});

async function fitViewportToContent(): Promise<boolean> {
  const height = Math.ceil(document.documentElement.scrollHeight);
  if (height <= layout.phone.height) return false;
  await page.viewport(layout.phone.width, height);
  return true;
}

function componentName(modulePath: string): string {
  const fileName = modulePath.split('/').at(-1) ?? modulePath;
  return fileName.replace(/\.stories\.tsx$/, '');
}

for (const [modulePath, storyModule] of Object.entries(storyModules)) {
  const name = componentName(modulePath);
  const visualStories = Object.entries(storyModule).filter(
    ([, story]) => isStory(story) && story.composed.tags.includes('visual'),
  );
  if (visualStories.length === 0) continue;
  describe(name, () => {
    for (const [exportName, story] of visualStories) {
      if (!isStory(story)) continue;
      test(exportName, async () => {
        const canvasElement = document.createElement('div');
        canvasElement.dataset.visualCanvas = '';
        document.body.append(canvasElement);
        let resized = false;
        try {
          await story.run({
            canvasElement,
            globals: {
              locale: 'ru',
              ...story.composed.globals,
              frame: 'phone',
              viewport: { value: 'phone', isRotated: false },
            },
          });
          await document.fonts.ready;
          resized = await fitViewportToContent();
          await expect
            .element(page.elementLocator(canvasElement))
            .toMatchScreenshot(`${name}/${exportName}`);
        } finally {
          canvasElement.remove();
          if (resized) await page.viewport(layout.phone.width, layout.phone.height);
        }
      });
    }
  });
}
