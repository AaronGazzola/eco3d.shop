export interface Product {
  id: string;
  photo: string;
  name: string;
  price: number;
  createdAt: string;
  deliveryStartDate: string;
  deliveryEndDate: string;
}

export interface Products {
  products: Product[];
}
