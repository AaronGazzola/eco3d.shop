import { Products } from "@/types/product.types";
import ProductCard from "@/components/products/ProductCard";
import { cn } from "@/lib/utils";

export default function ProductsList({ className }: { className?: string }) {
  return (
    <div className={cn(`w-full`, className)}>
      <div className="container w-[80%] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
      photo: "/images/products/v8/product1.jpg",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item2",
      name: "Product 2",
      photo: "/images/products/v8/product2.jpg",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item3",
      name: "Product 3",
      photo: "/images/products/v8/product3.jpg",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item4",
      name: "Product 4",
      photo: "/images/products/v8/product4.jpg",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item5",
      name: "Product 5",
      photo: "/images/products/v8/product1.jpg",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item6",
      name: "Product 6",
      photo: "/images/products/v8/product2.jpg",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item7",
      name: "Product 7",
      photo: "/images/products/v8/product3.jpg",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item8",
      name: "Product 8",
      photo: "/images/products/v8/product4.jpg",
      price: 100,
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
  ],
};
