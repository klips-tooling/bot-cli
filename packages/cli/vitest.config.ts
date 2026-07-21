import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      BOT_CLI_TEMPLATES: path.resolve(__dirname, '../../templates'),
    },
  },
});
