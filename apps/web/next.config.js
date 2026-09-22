/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cmp/shared"],
  async rewrites() {
    // Proxy /api/* to the NestJS backend so the browser only ever talks to
    // this app's own domain. Without this, the session cookie is a genuine
    // third-party cookie (Vercel domain vs Railway domain) — curl doesn't
    // enforce third-party cookie policy so it looked fine there, but real
    // browsers (Safari ITP, Chrome's phase-out) silently drop it, so
    // dev-login "succeeds" but nothing is actually signed in.
    const apiOrigin = process.env.API_PROXY_ORIGIN;
    if (!apiOrigin) return [];
    return [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }];
  },
};

module.exports = nextConfig;
