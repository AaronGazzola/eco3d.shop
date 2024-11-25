import { Products } from "@/types/product.types";
import ProductCard from "@/components/products/ProductCard";
import { cn } from "@/lib/utils";

export default function ProductsList({ className }: { className?: string }) {
  return (
    <div className={cn(`w-full`, className)}>
      <div className="container w-[80%] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
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
      photos: [
        "/images/products/v8/product1.jpg",
        "/images/products/v8/product2.jpg",
        "/images/products/v8/product3.jpg",
        "/images/products/v8/product4.jpg",
      ],
      price: 100,
      description:
        "Lorem Ipsum is placeholder text used in printing and typesetting, originating in the 1500s when a printer scrambled type to create a dummy text",
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item2",
      name: "Product 2",
      photos: [
        "/images/products/v8/product1.jpg",
        "/images/products/v8/product2.jpg",
        "/images/products/v8/product3.jpg",
        "/images/products/v8/product4.jpg",
      ],
      price: 100,
      description:
        "Lorem Ipsum is placeholder text used in printing and typesetting, originating in the 1500s when a printer scrambled type to create a dummy text",
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item3",
      name: "Product 3",
      photos: [
        "/images/products/v8/product1.jpg",
        "/images/products/v8/product2.jpg",
        "/images/products/v8/product3.jpg",
        "/images/products/v8/product4.jpg",
      ],
      price: 100,
      description:
        "Lorem Ipsum is placeholder text used in printing and typesetting, originating in the 1500s when a printer scrambled type to create a dummy text",
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item4",
      name: "Product 4",
      photos: [
        "/images/products/v8/product1.jpg",
        "/images/products/v8/product2.jpg",
        "/images/products/v8/product3.jpg",
        "/images/products/v8/product4.jpg",
      ],
      price: 100,
      description:
        "Lorem Ipsum is placeholder text used in printing and typesetting, originating in the 1500s when a printer scrambled type to create a dummy text",
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item5",
      name: "Product 5",
      photos: [
        "/images/products/v8/product1.jpg",
        "/images/products/v8/product2.jpg",
        "/images/products/v8/product3.jpg",
        "/images/products/v8/product4.jpg",
      ],
      price: 100,
      description:
        "Lorem Ipsum is placeholder text used in printing and typesetting, originating in the 1500s when a printer scrambled type to create a dummy text",
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item6",
      name: "Product 6",
      photos: [
        "/images/products/v8/product1.jpg",
        "/images/products/v8/product2.jpg",
        "/images/products/v8/product3.jpg",
        "/images/products/v8/product4.jpg",
      ],
      price: 100,
      description:
        "Lorem Ipsum is placeholder text used in printing and typesetting, originating in the 1500s when a printer scrambled type to create a dummy text",
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item7",
      name: "Product 7",
      photos: [
        "/images/products/v8/product1.jpg",
        "/images/products/v8/product2.jpg",
        "/images/products/v8/product3.jpg",
        "/images/products/v8/product4.jpg",
      ],
      price: 100,
      description:
        "Lorem Ipsum is placeholder text used in printing and typesetting, originating in the 1500s when a printer scrambled type to create a dummy text",
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
    {
      id: "item8",
      name: "Product 8",
      photos: [
        "/images/products/v8/product1.jpg",
        "/images/products/v8/product2.jpg",
        "/images/products/v8/product3.jpg",
        "/images/products/v8/product4.jpg",
      ],
      price: 100,
      description:
        "Lorem Ipsum is placeholder text used in printing and typesetting, originating in the 1500s when a printer scrambled type to create a dummy text",
      createdAt: "2024-11-20",
      deliveryStartDate: "2024-11-21",
      deliveryEndDate: "2024-11-22",
    },
  ],
};
