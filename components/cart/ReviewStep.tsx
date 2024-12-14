import { CartStep } from "@/types/ui.types";
import Image from "next/image";

type CartItem = {
  id: number;
  name: string;
  imageUrl: string;
  size: "Small" | "Medium" | "Large";
  colors: string[];
  primaryText?: string;
  secondaryText?: string;
  price: number;
};

const cartItems: CartItem[] = [
  {
    id: 1,
    name: "V8 Engine",
    imageUrl: "/images/products/V8/small/Set 3 second shoot-27.jpg",
    size: "Small",
    colors: ["Natural", "Black"],
    primaryText: "Happy\nBirthday",
    price: 19.99,
  },
  {
    id: 2,
    name: "V8 Engine",
    imageUrl: "/images/products/V8/medium/Set 3 second shoot-19.jpg",
    size: "Medium",
    colors: ["Natural", "Black"],
    primaryText: "Merry\nChristmas\nDad",
    secondaryText: "From John",
    price: 39.99,
  },
  {
    id: 3,
    name: "V8 Engine",
    imageUrl: "/images/products/V8/medium/Set 3 second shoot-19.jpg",
    size: "Medium",
    colors: ["Natural", "Black"],
    primaryText: "Merry\nChristmas\nDad",
    secondaryText: "From John",
    price: 39.99,
  },
  {
    id: 4,
    name: "V8 Engine",
    imageUrl: "/images/products/V8/medium/Set 3 second shoot-19.jpg",
    size: "Medium",
    colors: ["Natural", "Black"],
    primaryText: "Merry\nChristmas\nDad",
    secondaryText: "From John",
    price: 39.99,
  },
  {
    id: 5,
    name: "V8 Engine",
    imageUrl: "/images/products/V8/medium/Set 3 second shoot-19.jpg",
    size: "Medium",
    colors: ["Natural", "Black"],
    primaryText: "Merry\nChristmas\nDad",
    secondaryText: "From John",
    price: 39.99,
  },
];

const ReviewStep = ({ activeStep }: { activeStep: CartStep }) => {
  if (activeStep !== CartStep.Review) return null;
  return (
    <div className="space-y-4">
      {cartItems.map(item => (
        <div
          key={item.id}
          className="flex items-start space-x-4 border-b border-gray-200 pb-4"
        >
          <Image
            src={item.imageUrl}
            alt={item.name}
            width={80}
            height={80}
            className="rounded-md object-cover"
          />
          <div className="flex-1">
            <h3 className="font-bold">{item.name}</h3>
            <div className="text-sm space-y-1 text-gray-600">
              <p>Size: {item.size}</p>
              <p>Colors: {item.colors.join(", ")}</p>
              {item.primaryText && (
                <p className="whitespace-pre-line">
                  Primary text: {item.primaryText}
                </p>
              )}
              {item.secondaryText && (
                <p>Secondary text: {item.secondaryText}</p>
              )}
            </div>
            <p className="font-semibold mt-2">${item.price.toFixed(2)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReviewStep;
