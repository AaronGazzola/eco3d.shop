const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      process.env.NEXT_PUBLIC_SUPABASE_URL
        ? {
            protocol: "https",
            hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
          }
        : null,
    ].filter(Boolean),
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            typescript: true,
            svgoConfig: {
              plugins: [
                {
                  name: "preset-default",
                  params: {
                    overrides: {
                      removeViewBox: false,
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    });
    return config;
  },
  experimental: {
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
      resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".json", ".svg"],
      moduleIdStrategy:
        process.env.NODE_ENV === "production" ? "deterministic" : "named",
    },
  },
};

export default nextConfig;
