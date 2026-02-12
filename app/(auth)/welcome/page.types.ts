export type WelcomeFormData = {
  displayName: string;
  avatarUrl?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
};
