export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  size: "Small" | "Medium" | "Large";
  colors?: string[];
  primaryText?: string | string[];
  secondaryText?: string;
}
