"use client";

import { CartStep } from "@/types/ui.types";
import Image from "next/image";

type CartItem = {
  id: number;
  name: string;
  imageUrl: string;
  size: "Small" | "Medium" | "Large";
  colors: string[];
  primaryText?: string[];
  secondaryText?: string;
  price: number;
};

const cartItems: CartItem[] = [
  {
    id: 1,
    name: "V8 Engine",
    imageUrl: "/images/products/V8/small/Set 3 second shoot-27.jpg",
    size: "Small",
    colors: ["Natural", "Black", "White"],
    primaryText: ["Merry", "Christmas", "Grandpa"],
    secondaryText: "From Aaron",
    price: 19.99,
  },
];

const ReviewStep = ({ activeStep }: { activeStep: CartStep }) => {
  if (activeStep !== CartStep.Review) return null;

  return (
    <div className="space-y-4 py-2 ">
      {cartItems.map((item) => (
        <div
          key={item.id}
          className="first:border-t flex items-start space-x-4 border-b border-gray-200 py-4 text-gray-800"
        >
          <div className="w-[100] h-[100] xs:w-[150] xs:h-[150] relative">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-cover rounded-lg"
              priority
            />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg xs:text-xl mb-2">{item.name}</h3>
            <div className="text-sm xs:text-base space-y-1">
              <p>
                <span className="font-bold">Size: </span>
                {item.size}
              </p>
              <p className="whitespace-nowrap">
                <span className="font-bold">Colors: </span>{" "}
                {item.colors.join(", ")}
              </p>
              {item.primaryText && (
                <>
                  <p>
                    <span className="font-bold">Primary text: </span>
                  </p>
                  <div className="flex items-center flex-col py-1">
                    {item.primaryText.map((text, i) => (
                      <span className="text-base xs:text-lg italic" key={i}>
                        {text}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {item.secondaryText && (
                <>
                  <p>
                    <span className="font-bold">Secondary text: </span>
                  </p>
                  <div className="flex items-center flex-col py-1">
                    <span className="text-base xs:text-lg italic">
                      {item.secondaryText}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 w-full p-2 pl-0">
              <span className="font-bold text-sm xs:text-base">Price: </span>
              <span className="font-medium text-lg xs:text-xl flex items-center gap-px">
                <span className="font-normal text-base xs:text-lg">$</span>
                {item.price.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReviewStep;
