/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/chat": ["./skills/**/*"],
    },
  },
};

export default nextConfig;
