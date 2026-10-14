import { defineConfig } from 'cypress';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
  video: true,
  videoCompression: 28,
  viewportWidth: 1366,
  viewportHeight: 820,
  defaultCommandTimeout: 10000,
  e2e: {
    baseUrl: 'http://localhost:4173',
    supportFile: false,
    setupNodeEvents(on) {
      // Eklentiyi Cypress'in açtığı Chrome'a yükle.
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') launchOptions.extensions.push(resolve('dist'));
        return launchOptions;
      });
      on('task', {
        writeJson({ path, data }) {
          writeFileSync(path, JSON.stringify(data, null, 1));
          return null;
        },
      });
    },
  },
});
