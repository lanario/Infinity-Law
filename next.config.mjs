/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [],
  },
  webpack: (config) => {
    config.cache = {
      ...config.cache,
      maxMemoryGenerations: 1,
    };
    // supabase-js lê process.version só após checar typeof process (header X-Client-Info);
    // é seguro no Edge, mas a análise estática do middleware acusa em build sem cache.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /@supabase[\\/]supabase-js/, message: /process\.version/ },
    ];
    return config;
  },
};

export default nextConfig;
