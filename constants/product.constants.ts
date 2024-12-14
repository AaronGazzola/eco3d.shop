// lib/constants/product-customization.ts
import {
  DimensionsBySizeObject,
  MaterialImageMap,
  NonWhiteImages,
  SizeBasedImages,
} from "@/types/product.types";

export const DIMENSIONS_BY_SIZE: DimensionsBySizeObject = {
  Small: {
    width: "71mm",
    height: "94mm",
    depth: "60mm",
  },
  Medium: {
    width: "97mm",
    height: "138mm",
    depth: "57mm",
  },
  Large: {
    width: "127mm",
    height: "181mm",
    depth: "74mm",
  },
};

export const SIZE_BASED_IMAGES: SizeBasedImages = {
  Small: [
    "/images/products/V8/small/Set 3 second shoot-27.jpg",
    "/images/products/V8/small/Set 3 second shoot-28.jpg",
    "/images/products/V8/small/Set 3 second shoot-29.jpg",
    "/images/products/V8/small/Set 3 second shoot-30.jpg",
    "/images/products/V8/small/Set 3 second shoot-31.jpg",
    "/images/products/V8/small/Set 3 second shoot-32.jpg",
    "/images/products/V8/small/Set 3 second shoot-33.jpg",
    "/images/products/V8/small/Set 3 second shoot-45.jpg",
    "/images/products/V8/small/Set 3 second shoot-46.jpg",
    "/images/products/V8/small/Set 3 second shoot-47.jpg",
    "/images/products/V8/small/Set 3 second shoot-48.jpg",
  ],
  Medium: [
    "/images/products/V8/medium/Set 3 second shoot-19.jpg",
    "/images/products/V8/medium/Set 3 second shoot-20.jpg",
    "/images/products/V8/medium/Set 3 second shoot-21.jpg",
    "/images/products/V8/medium/Set 3 second shoot-22.jpg",
    "/images/products/V8/medium/Set 3 second shoot-23.jpg",
    "/images/products/V8/medium/Set 3 second shoot-24.jpg",
    "/images/products/V8/medium/Set 3 second shoot-25.jpg",
    "/images/products/V8/medium/Set 3 second shoot-26.jpg",
    "/images/products/V8/medium/Set 3 second shoot-42.jpg",
    "/images/products/V8/medium/Set 3 second shoot-43.jpg",
    "/images/products/V8/medium/Set 3 second shoot-44.jpg",
  ],
  Large: [
    "/images/products/V8/large/Set 3 second shoot-3.jpg",
    "/images/products/V8/large/Set 3 second shoot-4.jpg",
    "/images/products/V8/large/Set 3 second shoot-5.jpg",
    "/images/products/V8/large/Set 3 second shoot-6.jpg",
    "/images/products/V8/large/Set 3 second shoot-7.jpg",
    "/images/products/V8/large/Set 3 second shoot-39.jpg",
    "/images/products/V8/large/Set 3 second shoot-40.jpg",
    "/images/products/V8/large/Set 3 second shoot-41.jpg",
  ],
};

export const WHITE_IMAGES = [
  "/images/products/V8/details/Aaron set 3-31.jpg",
  "/images/products/V8/details/Aaron set 3-32.jpg",
  "/images/products/V8/details/Aaron set 3-40.jpg",
  "/images/products/V8/details/Aaron set 3-41.jpg",
];

export const NON_WHITE_IMAGES: NonWhiteImages = {
  Large: [
    "/images/products/V8/details/Aaron set 3-29.jpg",
    "/images/products/V8/details/Aaron set 3-30.jpg",
  ],
  Medium: [
    "/images/products/V8/details/Aaron set 3-37.jpg",
    "/images/products/V8/details/Aaron set 3-30.jpg",
  ],
  Small: ["/images/products/V8/details/Aaron set 3-33.jpg"],
};

export const COMMON_IMAGES = [
  "/images/products/V8/details/Aaron set 3-39.jpg",
  "/images/products/V8/details/Aaron set 3-42.jpg",
  "/images/products/V8/Set 3 second shoot-34.jpg",
  "/images/products/V8/Set 3 second shoot-37.jpg",
  "/images/products/V8/Set 3 second shoot-38.jpg",
];

export const MATERIAL_IMAGE_MAP: MaterialImageMap = {
  Natural: "/images/products/V8/details/Aaron set 3-42.jpg",
  White: "/images/products/V8/details/Aaron set 3-40.jpg",
  Black: "/images/products/V8/details/Aaron set 3-39.jpg",
};

export const ALL_IMAGES = [
  ...Object.values(SIZE_BASED_IMAGES).flat(),
  ...WHITE_IMAGES,
  ...Object.values(NON_WHITE_IMAGES).flat(),
  ...COMMON_IMAGES,
];
