// db.types.ts
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

export type DBImage = Tables<"images">;
export type VariantImage = Tables<"variant_images"> & {
  images: DBImage | null;
};
export type ProductVariant = Tables<"product_variants">;
export type ProductVariantWithImages = ProductVariant & {
  variant_images: VariantImage[];
};
export type ProductWithVariants = Tables<"products"> & {
  product_variants?: ProductVariantWithImages[];
};
