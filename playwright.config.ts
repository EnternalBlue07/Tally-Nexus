import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  timeout: 45 * 1000,
  expect: {
    timeout: 10 * 1000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
  },
  projects: [
    {
      name: 'desktop-1920x1080',
      use: {
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'desktop-1440x900',
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'laptop-1366x768',
      use: {
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: 'tablet-768x1024',
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'mobile-390x844',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
  ],
});

