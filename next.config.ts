import type { NextConfig } from "next";

// The site is published on GitHub Pages under /organization/. lib/site.ts reads this value for the paths that
// Next.js does not prefix itself: plain links, images, the opening script and metadata icons.
const basePath = "/organization";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
