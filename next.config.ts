/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  distDir: '.next',
  experimental: {
    // Set source directory to 'src'
    outputFileTracingRoot: process.cwd(),
  },
  srcDir: 'src',
};

export default nextConfig;
