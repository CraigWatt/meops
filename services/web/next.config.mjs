/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isGitHubPages ? "/meops" : undefined,
  images: {
    unoptimized: true
  },
  transpilePackages: ["@meops/core", "@meops/content", "@meops/store"]
};

export default nextConfig;
