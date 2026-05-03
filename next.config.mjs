/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@rivora-labz/snook-shared"],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
