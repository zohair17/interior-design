/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Editorial photography is pulled from Unsplash until MILO's own
    // object photography is available. Swap for a first-party host later.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    qualities: [60, 75, 90],
  },
};

export default nextConfig;
