"use client";

import QuantityControl from "@/components/cart/QuantityControlComponent";
import ConfirmDialog from "@/components/ux/ConfirmDialog";
import { SHIPPING_COST } from "@/constants/order.constants";
import { useCartStore } from "@/hooks/useCartStore";
import {
  calculateShippingCost,
  calculateSubtotal,
  calculateTotal,
  formatPrice,
  isEligibleForFreeShipping,
} from "@/lib/cart.util";
import { cn } from "@/lib/utils";
import { CartStep } from "@/types/ui.types";
import Image from "next/image";
import { useState } from "react";

const ReviewStep = ({
  activeStep,
  isTransitioning,
}: {
  activeStep: CartStep;
  isTransitioning: boolean;
}) => {
  const { items, updateQuantity, removeItem } = useCartStore();
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    updateQuantity(itemId, newQuantity);
  };

  const handleDeleteItem = (itemId: number) => {
    removeItem(itemId);
    setItemToDelete(null);
  };

  const subtotal = calculateSubtotal(items);
  const shipping = calculateShippingCost(subtotal);
  const total = calculateTotal(subtotal);

  return (
    <div
      className={cn(
        "space-y-4 py-2 px-4 overflow-y-auto absolute inset-0",
        isTransitioning && "overflow-y-hidden",
      )}
    >
      {itemToDelete && (
        <ConfirmDialog
          title="Remove Item"
          description="Are you sure you want to remove this item from your cart?"
          onConfirm={() => handleDeleteItem(itemToDelete)}
          onCancel={() => setItemToDelete(null)}
          confirmText="Remove"
          cancelText="Cancel"
          open={true}
        />
      )}
      {!items.length && (
        <div className="flex justify-center h-full pt-5">
          <p className="text-lg text-gray-800">No items in your cart</p>
        </div>
      )}
      <div className="flex flex-col h-full">
        <div className="flex-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="first:border-t flex items-stretch space-x-4 border-b border-gray-200 py-4 text-gray-800"
            >
              <div className="flex flex-col items-center justify-between pb-1.5">
                <div className="w-[100] h-[100] xs:w-[150] xs:h-[150] relative mb-4">
                  <Image
                    src={item.imageUrl || "/api/placeholder/150/150"}
                    alt={item.name}
                    fill
                    className="object-cover rounded-lg"
                    priority
                  />
                </div>
                <QuantityControl
                  quantity={item.quantity}
                  onQuantityChange={(newQuantity: number) =>
                    handleQuantityChange(item.id, newQuantity)
                  }
                  onDelete={() => setItemToDelete(item.id)}
                />
              </div>
              <div className="flex-1 flex flex-col">
                <h3 className="font-bold text-lg xs:text-xl mb-2">
                  {item.name}
                </h3>
                <div className="text-sm xs:text-base space-y-1">
                  <p>
                    <span className="font-bold">Size: </span>
                    {item.size}
                  </p>
                  <p className="whitespace-nowrap">
                    <span className="font-bold">Colors: </span>
                    {item.colors?.join(", ")}
                  </p>
                  {item.primaryText && (
                    <>
                      <p>
                        <span className="font-bold">Primary text: </span>
                      </p>
                      <div className="flex items-center flex-col py-1">
                        {(Array.isArray(item.primaryText)
                          ? item.primaryText
                          : [item.primaryText]
                        ).map((text, i) => (
                          <p className="text-base xs:text-lg italic" key={i}>
                            {text}
                          </p>
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
                <div className="flex items-end justify-end gap-2 w-full p-2 xs:pt-4 pl-0 flex-grow">
                  <span className="font-medium text-lg xs:text-xl flex items-center gap-px">
                    <span className="font-normal text-base xs:text-lg">$</span>
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="border-t border-gray-200 py-4 space-y-2">
            <div className="flex justify-between text-base">
              <span>Subtotal</span>
              <span>${formatPrice(subtotal)}</span>
            </div>
            <div
              className={cn(
                "flex justify-between text-base",
                isEligibleForFreeShipping(subtotal) && "line-through",
              )}
            >
              <span>Shipping</span>
              <span>${formatPrice(SHIPPING_COST)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total AUD</span>
              <span>${formatPrice(total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewStep;
