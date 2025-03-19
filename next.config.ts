/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  distDir: '.next',
  // This indicates we're using the /src directory structure
  experimental: {
    // Ensure we're using the app directory from src
    appDir: true,
  }
};

export default nextConfig;
