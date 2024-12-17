// OrderDetails.tsx
"use client";
import { OrderItem } from "@/types/order.types";
import Image from "next/image";

interface OrderDetailsProps {
  items: OrderItem[];
}

const OrderDetails = ({ items }: OrderDetailsProps) => {
  return (
    <div className="py-4 space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col sm:flex-row gap-4 text-gray-800"
        >
          <div className="flex-shrink-0">
            <div className="w-[100px] h-[100px] relative">
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover rounded-lg"
                priority
              />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-lg xs:text-xl mb-2">{item.name}</h3>
            <div className="text-sm xs:text-base space-y-1 sm:flex sm:gap-4 sm:space-y-0">
              <div className="space-y-1">
                <p>
                  <span className="font-bold">Size: </span>
                  {item.size}
                </p>
                <p className="whitespace-nowrap">
                  <span className="font-bold">Colors: </span>
                  {item.colors.join(", ")}
                </p>
              </div>

              <div className="space-y-1">
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
                  <div>
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

          <div className="flex items-center sm:items-start justify-end gap-2 sm:min-w-[100px]">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
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
      <div className="flex justify-end pt-4 border-t">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total</p>
          <span className="font-bold text-xl">
            $
            {items
              .reduce((sum, item) => sum + item.price * item.quantity, 0)
              .toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
