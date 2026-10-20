import type { NextConfig } from 'next'
import path from 'node:path'

// Set NEXT_PUBLIC_BASE_PATH=/Tracker when deploying to a GitHub Pages project site.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: basePath || undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  // The parent repo has its own lockfile; pin the workspace root to this folder.
  turbopack: { root: path.resolve(__dirname) },
}

export default nextConfig
