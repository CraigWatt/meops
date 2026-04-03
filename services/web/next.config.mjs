/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@meops/core", "@meops/content", "@meops/store"]
};

export default nextConfig;
