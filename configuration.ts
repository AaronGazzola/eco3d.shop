const production = process.env.NODE_ENV === "production";

const configuration = {
  site: {
    name: "Eco3D",
    description:
      "Discover eco-friendly 3D printed products made with biodegradable PHA at Eco3D",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    twitterHandle: "",
    instagramHandle: "",
    facebookHandle: "",
    youtubeHandle: "",
  },
  paths: {
    appHome: "/",
    admin: {
      path: "/admin",
      products: "/admin/products",
      product: (id: string) => `/admin/products/${id}`,
      users: "/admin/users",
      user: (id: string) => `/admin/users/${id}`,
      orders: "/admin/orders",
      order: (id: string) => `/admin/orders/${id}`,
      queue: "/admin/queue",
      queueItem: (id: string) => `/admin/queue/${id}`,
      promo: "/admin/promo",
    },
    auth: "/auth",
    signIn: "/auth?form=sign-in",
    forgotPassword: "/auth?form=forgot-password",
    resetPassword: "/reset-password",
    authCallback: "/auth/callback",
    resetPasswordCallback: "/reset-password/callback",
    pricing: "/pricing",
    privacy: "/privacy",
    terms: "/terms",
    faq: "/faq",
    notFound: "/404",
  },
  production,
};

export default configuration;
