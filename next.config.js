/** @type {import('next').NextConfig} */
const nextConfig = {
  // Для деплою на VPS: next start використовує .next/standalone (менший розмір)
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 3000,
        ignored: [
          "**/node_modules/**",
          "**/.next/**",
          "**/.git/**",
          "**/prisma/*.db",
          "**/*.log",
          "**/terminals/**",
        ],
      };
    }
    return config;
  },
};

module.exports = nextConfig;
