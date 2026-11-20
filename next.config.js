/** @type {import('next').NextConfig} */
const isExport = process.env.STATIC_EXPORT === 'true' || process.env.GITHUB_PAGES === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  transpilePackages: ['lunar-javascript'],
  ...(isExport ? { output: 'export' } : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  images: { unoptimized: true },
};

module.exports = nextConfig;
