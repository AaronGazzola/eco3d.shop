"use client";

import { MS_PER_DAY, ShippingDays } from "@/constants/order.constants";
import { useCartQTime } from "@/hooks/productVariantHooks";

import { useCartStore } from "@/hooks/useCartStore";
import { Address } from "@/types/order.types";
import { addMilliseconds, format } from "date-fns";
import { Calendar, Clock, LoaderCircle, Printer, Truck } from "lucide-react";

const ShippingCalculation = ({
  address,
  isActive = false,
}: {
  address: Address;
  isActive?: boolean;
}) => {
  const { items } = useCartStore();
  const { data, isPending } = useCartQTime(items, isActive);

  const formatDuration = (ms: number) => {
    const days = Math.floor(ms / MS_PER_DAY);
    const hours = Math.floor((ms % MS_PER_DAY) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
  };
  const shippingDays =
    address.state === "VIC" ? ShippingDays.Victoria : ShippingDays.Default;

  const totalTime =
    (data?.qTime || 0) + (data?.printTime || 0) + shippingDays * MS_PER_DAY;
  const estimatedDelivery = addMilliseconds(new Date(), totalTime);

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-8 pt-4">
        <div className="flex flex-col items-center gap-2">
          <span className="text-muted-foreground font-semibold">
            Queue time:
          </span>
          <span className="bg-gray-100 rounded-full flex items-center gap-3 justify-center text-gray-900 font-medium px-5 py-2">
            <Clock className="w-5 h-5" />
            {isPending ? (
              <LoaderCircle className="animate-spin w-5 h-5" />
            ) : (
              formatDuration(data?.qTime || 0)
            )}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-muted-foreground font-semibold">
            Print time:
          </span>
          <span className="bg-gray-100 rounded-full flex items-center gap-3 justify-center text-gray-900 font-medium px-5 py-2">
            <Printer className="w-5 h-5" />
            {isPending ? (
              <LoaderCircle className="animate-spin w-5 h-5" />
            ) : (
              formatDuration(data?.printTime || 0)
            )}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-muted-foreground font-semibold">
            Delivery time:
          </span>
          <span className="bg-gray-100 rounded-full flex items-center gap-3 justify-center text-gray-900 font-medium px-5 py-2">
            <Truck className="w-5 h-5" />
            {shippingDays}d
          </span>
        </div>
      </div>
      <div className="space-y-2 text-center pt-4 pb-1">
        <div className="font-semibold text-muted-foreground">
          <span>Est. Delivery:</span>
        </div>
        <p className="text-xl font-medium flex items-center justify-center w-full gap-3">
          <Calendar className="w-5 h-5 mb-0.5" />
          {isPending ? (
            <LoaderCircle className="animate-spin w-5 h-5" />
          ) : (
            format(estimatedDelivery, "d MMM yyyy")
          )}
        </p>
      </div>
    </>
  );
};

export default ShippingCalculation;
