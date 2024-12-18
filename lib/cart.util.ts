export const SHIPPING_COST = 11.99;

export const calculateTotal = (subtotal: number): number => {
  return subtotal + SHIPPING_COST;
};
