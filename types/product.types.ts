// product.types.ts

import { AddToCartStep } from "@/types/ui.types";

export type ImageSize = "Small" | "Medium" | "Large";

export interface DimensionsBySize {
  width: string;
  height: string;
  depth: string;
}

export interface DimensionsBySizeObject {
  [key: string]: DimensionsBySize;
}

export interface SizeBasedImages {
  [key: string]: string[];
}

export interface NonWhiteImages {
  [key: string]: string[];
}

export interface GetImagesResult {
  primary: string;
  secondary: string | null;
}

export interface PersonaliseFormValues {
  primaryMessage: string;
  secondaryMessage: string;
}

export interface FormValues {
  size: ImageSize;
  colors: string[];
}

export interface MaterialImageMap {
  [key: string]: string;
}

export interface ProductStepProps {
  step: AddToCartStep;
  activeStep: AddToCartStep;
  onChangeActiveStep: (step: AddToCartStep) => void;
  isDisabled?: boolean;
}

export interface CompressedCustomiseFormProps {
  size: ImageSize;
  colors: string[];
  onSizeChange: (size: ImageSize) => void;
  onColorChange: (colors: string[]) => void;
}

export interface CustomiseFormProps {
  isAnimating: boolean;
}

export interface PersonaliseFormProps {
  isAnimating: boolean;
}

export interface AddToCartSummaryProps {
  isNext: boolean;
}

export interface VariantAttributes {
  size: "sm" | "md" | "lg";
  color: string[];
}
