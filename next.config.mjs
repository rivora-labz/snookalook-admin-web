/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@snook/shared"],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
