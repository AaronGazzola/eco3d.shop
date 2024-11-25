export interface Product {
  id: string;
  photos: string[];
  name: string;
  price: number;
  description: string;
  createdAt: string;
  deliveryStartDate: string;
  deliveryEndDate: string;
}

export interface Products {
  products: Product[];
}
