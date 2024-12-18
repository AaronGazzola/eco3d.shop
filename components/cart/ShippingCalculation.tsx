"use client";

import { MS_PER_DAY, ShippingDays } from "@/constants/order.constants";
import { useFindVariantsByAttributes } from "@/hooks/productVariantHooks";
import { useQueueTime } from "@/hooks/qHooks";
import { useCartStore } from "@/hooks/useCartStore";
import { Address } from "@/types/order.types";
import { addMilliseconds, format } from "date-fns";
import { Clock, Printer, Truck } from "lucide-react";

const ShippingCalculation = ({ address }: { address: Address }) => {
  const { items, shippingState } = useCartStore();
  const { data: variantIds } = useFindVariantsByAttributes(items);
  const { data } = useQueueTime(variantIds || []);

  const formatDuration = (ms: number) => {
    const days = Math.floor(ms / MS_PER_DAY);
    const hours = Math.floor((ms % MS_PER_DAY) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
  };
  const shippingDays =
    address.state === "VIC" ? ShippingDays.Victoria : ShippingDays.Default;

  const totalTime =
    (data?.queueTimeMs || 0) +
    (data?.printTimeMs || 0) +
    shippingDays * MS_PER_DAY;
  const estimatedDelivery = addMilliseconds(new Date(), totalTime);

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-8 pt-4">
        <div className="flex flex-col items-center gap-2">
          <span className="text-muted-foreground font-medium">Queue time:</span>
          <span className="bg-gray-100 rounded-full flex items-center gap-1.5 justify-center text-gray-900 px-3 py-2">
            <Clock className="w-5 h-5" />
            {formatDuration(data?.queueTimeMs || 0)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-muted-foreground font-medium">Print time:</span>
          <span className="bg-gray-100 rounded-full flex items-center gap-1.5 justify-center text-gray-900 px-3 py-2">
            <Printer className="w-5 h-5" />
            {formatDuration(data?.printTimeMs || 0)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-muted-foreground font-medium">
            Delivery time:
          </span>
          <span className="bg-gray-100 rounded-full flex items-center gap-1.5 justify-center text-gray-900 px-3 py-2">
            <Truck className="w-5 h-5" />
            {shippingDays}d
          </span>
        </div>
      </div>
      <div className="space-y-2 text-center pt-4">
        <p className="text-lg font-medium">
          Est. Delivery: {format(estimatedDelivery, "d MMM yyyy")}
        </p>
      </div>
    </>
  );
};

export default ShippingCalculation;
