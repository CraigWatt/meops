/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@meops/core", "@meops/content"]
};

export default nextConfig;
