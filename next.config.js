/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  /* config options here */
  distDir: '.next',
  // This indicates we're using the /src directory structure
  experimental: {
    // Ensure we're using the app directory from src
    appDir: true,
  },
  // Add webpack configuration for path aliases
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    return config;
  },
};

module.exports = nextConfig; 