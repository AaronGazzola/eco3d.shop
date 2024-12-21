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
      qs: "/admin/q",
      q: (id: string) => `/admin/q/${id}`,
      promo: "/admin/promo",
    },
    me: {
      success: "/me?success=true",
      path: "/me",
    },
    paymentSuccess: "/payment/success",
    product: (slug: string) => `/${slug}`,
    auth: "/auth",
    signIn: "/auth?form=sign-in",
    forgotPassword: "/auth?form=forgot-password",
    resetPassword: "/reset-password",
    authCallback: "/auth/callback",
    resetPasswordCallback: "/reset-password/callback",
    privacy: "/privacy",
    terms: "/terms",
    faq: "/faq",
    notFound: "/404",
    contact: "/contact",
  },
  production,
};

export default configuration;
