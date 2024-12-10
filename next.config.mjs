const nextConfig = {
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
};

export default nextConfig;
