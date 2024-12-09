import React from "react";
import Image from "next/image";
import { ShoppingBasket } from "lucide-react";

import Checkout from "./Checkout";

const dummyCartData = [
  {
    id: 1,
    name: "Product 1",
    imageUrl: "/images/products/Digger/Aaron Set 2-4.jpg",
    price: 100,
    quantity: 2,
  },
  {
    id: 2,
    name: "Product 2",
    imageUrl: "/images/products/Digger/Aaron Set 2-4.jpg",
    price: 200,
    quantity: 1,
  },
  {
    id: 3,
    name: "Product 3",
    imageUrl: "/images/products/Digger/Aaron Set 2-4.jpg",
    price: 300,
    quantity: 3,
  },
  {
    id: 4,
    name: "Product 4",
    imageUrl: "/images/products/Digger/Aaron Set 2-4.jpg",
    price: 300,
    quantity: 3,
  },
  {
    id: 5,
    name: "Product 5",
    imageUrl: "/images/products/Digger/Aaron Set 2-4.jpg",
    price: 300,
    quantity: 3,
  },
  {
    id: 6,
    name: "Product 6",
    imageUrl: "/images/products/Digger/Aaron Set 2-4.jpg",
    price: 300,
    quantity: 3,
  },
  {
    id: 7,
    name: "Product 7",
    imageUrl: "/images/products/Digger/Aaron Set 2-4.jpg",
    price: 300,
    quantity: 3,
  },
  {
    id: 8,
    name: "Product 8",
    imageUrl: "/images/products/Digger/Aaron Set 2-4.jpg",
    price: 300,
    quantity: 3,
  },
  {
    id: 9,
    name: "Product 9",
    imageUrl: "/images/products/Digger/Aaron Set 2-4.jpg",
    price: 300,
    quantity: 3,
  },
  {
    id: 10,
    name: "Product 10",
    imageUrl: "/images/products/Digger/Aaron Set 2-4.jpg",
    price: 300,
    quantity: 3,
  },
  {
    id: 11,
    name: "Product 11",
    imageUrl: "/images/products/Digger/Aaron Set 2-4.jpg",
    price: 300,
    quantity: 3,
  },
  {
    id: 12,
    name: "Product 12",
    imageUrl: "/images/products/Digger/Aaron Set 2-4.jpg",
    price: 300,
    quantity: 3,
  },
  
];

export const Cart = () => {
  return (
    <div className="w-full h-full flex flex-col items-stretch min-h-screen p-4">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-4 flex flex-col">
        <div className="flex flex-row gap-5 items-center mb-4">
          <ShoppingBasket />
          <h2 className="text-lg font-bold">Your cart</h2>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[27rem]">
          {Array.isArray(dummyCartData) && dummyCartData.length > 0
            ? dummyCartData.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-4 border-b border-gray-200 py-3"
                >
                  <Image
                    src={item.imageUrl}
                    alt="Item"
                    height={96}
                    width={96}
                    className="w-16 h-16 rounded-md object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <p className="text-gray-500 text-xs">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    </p>
                  </div>
                </div>
              ))
            : "No Data"}
        </div>
        <Checkout />
      </div>
    </div>
  );
};
