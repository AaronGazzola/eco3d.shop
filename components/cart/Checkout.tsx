import React from "react";
import { ShoppingCartIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { poppins } from "@/styles/fonts";
import { Button } from "../ui/button";

const Checkout = () => {
  return (
    <>
      <div
        className={cn(
          "mt-4 font-semibold text-sm text-black",
          poppins.className,
        )}
      >
        <div className="flex justify-end gap-1">
          <span>Carbon offset:</span>
          <span>$0.20</span>
        </div>
        <div className="flex justify-end gap-1">
          <span>Shipping:</span>
          <span>$12.00</span>
        </div>
        <div className="flex justify-end gap-1">
          <span>Total:</span>
          <span>$12.20</span>
        </div>
      </div>
      <Button
        className={cn(
          "w-full bg-primary text-base text-white font-bold py-2 mt-4 rounded-md flex gap-4",
          poppins.className,
        )}
      >
        <ShoppingCartIcon />
        Checkout
      </Button>
    </>
  );
};

export default Checkout;
