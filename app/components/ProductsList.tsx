import { Products } from "@/types/product.types";
import ProductCard from "@/components/products/ProductCard";
import { Key } from "react";

export default function ProductsList() {
  return (
    <div className="w-full">
      <div className="container w-[80%] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ProductsMockData.products.map(product => {
          return <ProductCard key={product.id} {...product} />;
        })}
      </div>
    </div>
  );
}

const ProductsMockData: Products = {
  products: [
    {
      id: "item1",
      name: "Product 1",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item1",
      name: "Product 1",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item1",
      name: "Product 1",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item1",
      name: "Product 1",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item1",
      name: "Product 1",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item1",
      name: "Product 1",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item1",
      name: "Product 1",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item1",
      name: "Product 1",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
  ],
};
