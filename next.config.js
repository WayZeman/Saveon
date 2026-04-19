/** @type {import('next').NextConfig} */
const nextConfig = {
  // Для деплою на VPS: next start використовує .next/standalone (менший розмір)
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  async headers() {
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value:
          "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: https: blob:; font-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https: wss:; upgrade-insecure-requests",
      },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
      },
    ];
    return [{ source: "/:path*", headers: securityHeaders }];
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
