import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COST,
} from "@/constants/order.constants";

export const calculateSubtotal = (
  items: { price: number; quantity: number }[],
): number => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
};

export const calculateShippingCost = (subtotal: number): number => {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
};

export const calculateTotal = (subtotal: number): number => {
  const shipping = calculateShippingCost(subtotal);
  return subtotal + shipping;
};

export const formatPrice = (price: number): string => {
  return price.toFixed(2);
};

export const isEligibleForFreeShipping = (subtotal: number): boolean => {
  return subtotal >= FREE_SHIPPING_THRESHOLD;
};
