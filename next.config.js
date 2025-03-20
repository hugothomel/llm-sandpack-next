/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  /* config options here */
  distDir: '.next',
  // Webpack configuration for path aliases
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    return config;
  },
};

module.exports = nextConfig; 