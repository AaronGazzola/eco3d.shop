"use client";
import { OrderItem } from "@/types/order.types";
import Image from "next/image";

interface OrderDetailsProps {
  items: OrderItem[];
  shippingCost: number;
}

const getImageBySize = (size: "Small" | "Medium" | "Large") => {
  switch (size) {
    case "Small":
      return "/images/products/V8/small/Set 3 second shoot-28.jpg";
    case "Medium":
      return "/images/products/V8/medium/Set 3 second shoot-22.jpg";
    case "Large":
      return "/images/products/V8/Large/Set 3 second shoot-4.jpg";
    default:
      return "/images/products/V8/small/Set 3 second shoot-28.jpg";
  }
};

const OrderDetails = ({ items, shippingCost }: OrderDetailsProps) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const total = subtotal + shippingCost;

  return (
    <div className="py-4 space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col sm:flex-row gap-4 text-gray-800 first:border-t border-b py-8 px-2 pr-4"
        >
          <div className="flex-shrink-0 pb-4 sm:pb-0">
            <div className="w-[100px] h-[100px] relative">
              <Image
                src={getImageBySize(item.size)}
                alt={item.name}
                fill
                className="object-cover rounded-lg"
                priority
              />
            </div>
          </div>

          <div className="flex-1 pl-4">
            <h3 className="font-bold text-lg xs:text-xl mb-4">{item.name}</h3>
            <div className="text-sm xs:text-base space-y-1 flex sm:gap-4 sm:space-y-0 pl-4">
              <div className="space-y-1 w-[50%]">
                <p>
                  <span className="font-bold">Size: </span>
                </p>
                <p>{item.size}</p>
                <p className="pt-3">
                  <span className="font-bold">Colors: </span>
                </p>
                {item.colors.map((color, i) => (
                  <p key={i}>{color}</p>
                ))}
              </div>

              <div className="space-y-1 w-[50%]">
                {item.primaryText && (
                  <div>
                    <p className="font-bold">Primary text:</p>
                    <div className="flex flex-col py-1">
                      {item.primaryText.map((text, i) => (
                        <span className="text-base xs:text-lg italic" key={i}>
                          {text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.secondaryText && (
                  <div className="pt-3">
                    <p className="font-bold">Secondary text:</p>
                    <div className="flex flex-col py-1">
                      <span className="text-base xs:text-lg italic">
                        {item.secondaryText}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center sm:items-end justify-end gap-2 sm:min-w-[100px] pt-5">
            <div className="text-right">
              <p className="text-muted-foreground font-semibold">
                Qty: {item.quantity}
              </p>
              <span className="font-medium text-lg xs:text-xl flex items-center gap-px justify-end">
                <span className="font-normal text-base xs:text-lg">$</span>
                {(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-end pt-4">
        <div className="text-right space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">Subtotal</p>
            <span className="font-medium text-lg">${subtotal.toFixed(2)}</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Shipping</p>
            <span className="font-medium text-lg">
              ${shippingCost.toFixed(2)}
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <span className="font-bold text-xl">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
