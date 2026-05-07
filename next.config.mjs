/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    const securityHeaders = [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=()',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https:",
          "style-src 'self' 'unsafe-inline' https:",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
          "connect-src 'self' https: wss:",
          "frame-src https:",
          "form-action 'self'",
          "upgrade-insecure-requests",
        ].join('; '),
      },
    ]

    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
