/** @type {import('next').NextConfig} */
const nextConfig = {
  // Для деплою на VPS: next start використовує .next/standalone (менший розмір)
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
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
