import { Tables } from "@/types/database.types";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface HookOptions<T, K = { id: string }> {
  updateData?: Partial<T> & K;
  errorMessage?: string;
  successMessage?: string;
  initialData?: T | null;
}

export type PromoCodeWithPromoKey = Tables<"promo_codes"> & {
  promo_key: Tables<"promo_keys"> | null;
};

export type Product = Tables<"products">;

export type ProductWithVariants = Tables<"products"> & {
  product_variants?: Tables<"product_variants">[];
};

export type ProductVariant = Tables<"product_variants">;

export type ProductVariantWithImages = Tables<"product_variants"> & {
  images: Tables<"images">[];
};
