import { isStory } from 'storybook/internal/csf';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';

const storyModules = import.meta.glob<Record<string, unknown>>('../src/**/*.stories.tsx', {
  eager: true,
});

function componentName(modulePath: string): string {
  const fileName = modulePath.split('/').at(-1) ?? modulePath;
  return fileName.replace(/\.stories\.tsx$/, '');
}

for (const [modulePath, storyModule] of Object.entries(storyModules)) {
  const name = componentName(modulePath);
  describe(name, () => {
    for (const [exportName, story] of Object.entries(storyModule)) {
      if (!isStory(story)) continue;
      test(exportName, async () => {
        const canvasElement = document.createElement('div');
        canvasElement.dataset.visualCanvas = '';
        document.body.append(canvasElement);
        try {
          await story.run({ canvasElement });
          await document.fonts.ready;
          await expect
            .element(page.elementLocator(canvasElement))
            .toMatchScreenshot(`${name}/${exportName}`);
        } finally {
          canvasElement.remove();
        }
      });
    }
  });
}
