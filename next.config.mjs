/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // These packages use native Node.js APIs (fs, path) and must NOT be
  // bundled by Turbopack/webpack. They run only in API route server context.
  serverExternalPackages: ['pdf-parse', 'mammoth', 'adm-zip'],
}

export default nextConfig
