const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@orcher/workbench-core',
    '@orcher/workbench-di',
    '@orcher/workbench-plugin-api',
    '@orcher/workbench-services',
    '@orcher/workbench-ui',
    '@orcher/workbench-window-manager',
    '@orcher/workbench-plugin-welcome',
    '@orcher/workbench-plugin-settings',
    '@orcher/workbench-plugin-search',
    '@orcher/workbench-plugin-header',
    '@orcher/workbench-plugin-breadcrumb-bar',
    '@orcher/workbench-plugin-explorer',
  ],
  webpack: (config) => {
    // Resolve workspace packages from source
    config.resolve.alias = {
      ...config.resolve.alias,
      '@orcher/workbench-di': path.resolve(__dirname, '../../packages/di/src'),
      '@orcher/workbench-plugin-api': path.resolve(
        __dirname,
        '../../packages/plugin-api/src',
      ),
      '@orcher/workbench-services': path.resolve(
        __dirname,
        '../../packages/services/src',
      ),
      '@orcher/workbench-ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@orcher/workbench-window-manager': path.resolve(
        __dirname,
        '../../packages/window-manager/src',
      ),
      '@orcher/workbench-core': path.resolve(__dirname, '../../packages/core/src'),
      '@orcher/workbench-plugin-welcome': path.resolve(
        __dirname,
        '../../plugins/builtin/welcome/src',
      ),
      '@orcher/workbench-plugin-settings': path.resolve(
        __dirname,
        '../../plugins/builtin/settings/src',
      ),
      '@orcher/workbench-plugin-search': path.resolve(
        __dirname,
        '../../plugins/builtin/search/src',
      ),
      '@orcher/workbench-plugin-header': path.resolve(
        __dirname,
        '../../plugins/builtin/header/src',
      ),
      '@orcher/workbench-plugin-breadcrumb-bar': path.resolve(
        __dirname,
        '../../plugins/builtin/breadcrumb-bar/src',
      ),
      '@orcher/workbench-plugin-explorer': path.resolve(
        __dirname,
        '../../plugins/builtin/explorer/src',
      ),
    };
    return config;
  },
};

module.exports = nextConfig;
