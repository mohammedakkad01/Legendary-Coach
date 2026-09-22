import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  // Automatic base path detection for GitHub Pages
  // When running in GitHub Actions, GITHUB_REPOSITORY is automatically provided (e.g. "owner/repo-name")
  // Or VITE_BASE_PATH can be passed explicitly if needed.
  let basePath = '/';
  if (process.env.GITHUB_REPOSITORY) {
    const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];
    basePath = repoName ? `/${repoName}/` : '/';
  } else if (process.env.VITE_BASE_PATH) {
    basePath = process.env.VITE_BASE_PATH;
  }

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
