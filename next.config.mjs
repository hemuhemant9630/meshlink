/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg'],
  experimental: { serverActions: { bodySizeLimit: '1mb' } },
};
export default nextConfig;
