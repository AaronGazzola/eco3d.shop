// OrderProgress.tsx
"use client";
import { cn } from "@/lib/utils";
import { OrderStatus, RefundStatus } from "@/types/order.types";
import {
  ArrowLeftRight,
  CheckCircle2,
  CircleDot,
  Clock,
  Package,
  PackageOpen,
  Printer,
  SquareArrowOutUpRight,
  Truck,
} from "lucide-react";
import Link from "next/link";

interface OrderProgressProps {
  status: OrderStatus | RefundStatus;
  isRefund: boolean;
  trackingNumber?: string;
}

const OrderProgress = ({
  status,
  isRefund,
  trackingNumber,
}: OrderProgressProps) => {
  const getProgressWidth = (
    currentStatus: OrderStatus | RefundStatus,
    isRefund: boolean,
  ) => {
    if (isRefund) {
      const positions = {
        [RefundStatus.Pending]: "33%",
        [RefundStatus.Processing]: "66%",
        [RefundStatus.Processed]: "100%",
      };
      return positions[currentStatus as RefundStatus];
    }
    const positions = {
      [OrderStatus.Waiting]: "25%",
      [OrderStatus.Printing]: "50%",
      [OrderStatus.Shipped]: "75%",
      [OrderStatus.Packing]: "75%",
      [OrderStatus.Delivered]: "100%",
    };
    return positions[currentStatus as OrderStatus];
  };

  if (isRefund) {
    const icons = [
      {
        icon: ArrowLeftRight,
        status: RefundStatus.Pending,
        label: "Refund Requested",
      },
      {
        icon: CircleDot,
        status: RefundStatus.Processing,
        label: "Processing Refund",
      },
      {
        icon: CheckCircle2,
        status: RefundStatus.Processed,
        label: "Refund Complete",
      },
    ];

    return (
      <div className="w-full mt-4">
        <div className="flex">
          {icons.map(({ icon: Icon, status: iconStatus, label }) => {
            const isActive = status === iconStatus;
            let isPast =
              isActive ||
              (status === RefundStatus.Processing &&
                iconStatus === RefundStatus.Pending);

            return (
              <div
                key={iconStatus}
                className="flex flex-col items-center gap-2 font-bold text-primary pb-4 w-[33%]"
              >
                {isActive && <h3 className="text-center">{label}</h3>}
              </div>
            );
          })}
        </div>
        <div className="relative">
          <div className="absolute w-full h-1 bg-gray-200 rounded">
            <div
              className="absolute h-full bg-primary rounded transition-all duration-500"
              style={{ width: getProgressWidth(status, true) }}
            />
          </div>
          <div className="flex w-full pt-5">
            {icons.map(({ icon: Icon, status: currentStatus }) => (
              <div
                key={currentStatus}
                className="flex flex-col items-center flex-grow"
              >
                <Icon
                  className={cn(
                    "w-6 h-6 bg-white",
                    getProgressWidth(status, true) >=
                      getProgressWidth(currentStatus, true)
                      ? "text-primary"
                      : "text-gray-300",
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const icons = [
    { icon: Clock, status: OrderStatus.Waiting, label: "Waiting in queue" },
    { icon: Printer, status: OrderStatus.Printing, label: "Printing" },
    { icon: Truck, status: OrderStatus.Shipped, label: "Shipped" },
    { icon: Package, status: OrderStatus.Delivered, label: "Delivered" },
  ];

  return (
    <div className="w-full mt-4">
      <div className="flex w-full">
        {icons.map(({ status: iconStatus, label }, i) => {
          const isActive = status === iconStatus;
          return (
            <div
              key={iconStatus}
              className="flex flex-col items-center gap-2 font-bold text-primary pb-4 w-[33%]"
            >
              {isActive && <h3 className="text-center">{label}</h3>}
            </div>
          );
        })}
      </div>
      <div className="relative">
        <div className="absolute w-full h-1 bg-gray-200 rounded">
          <div
            className="absolute h-full bg-primary rounded transition-all duration-500"
            style={{ width: getProgressWidth(status, false) }}
          />
        </div>
        <div className="flex">
          {icons.map(({ icon: Icon, status: iconStatus }) => {
            const isActive = status === iconStatus;
            const isShipped = iconStatus === OrderStatus.Shipped;
            let isPast =
              isActive ||
              (status === OrderStatus.Printing &&
                iconStatus === OrderStatus.Waiting) ||
              (status === OrderStatus.Shipped &&
                (iconStatus === OrderStatus.Printing ||
                  iconStatus === OrderStatus.Waiting));

            return (
              <div
                style={{ width: "25%" }}
                key={iconStatus}
                className="flex flex-col items-center gap-2"
              >
                <div className="text-sm whitespace-nowrap px-2.5 py-1.5 flex flex-col items-center text-primary font-semibold relative w-full gap-5 pt-6 justify-end h-full">
                  {status !== OrderStatus.Delivered && (
                    <div
                      className={cn(
                        "border-2 rounded-full items-center justify-center py-1.5 flex",
                        !isActive && "opacity-0",
                        isShipped
                          ? "rounded-none border-transparent border-b-secondary text-secondary px-1"
                          : "border-green-700 px-3.5",
                      )}
                    >
                      {(iconStatus === OrderStatus.Waiting ||
                        iconStatus === OrderStatus.Printing) &&
                        "00:28:28:29"}
                      {isShipped && (
                        <Link
                          href={`/tracking/${trackingNumber}`}
                          className="flex items-center gap-2"
                        >
                          <span>Track package</span>
                          <SquareArrowOutUpRight className="mt-0.5 w-4 h-4 stroke-2" />
                        </Link>
                      )}
                    </div>
                  )}
                  {iconStatus === OrderStatus.Delivered &&
                  status === OrderStatus.Delivered ? (
                    <PackageOpen className="w-6 h-6 bg-white flex-shrink-0 text-primary" />
                  ) : (
                    <Icon
                      className={cn(
                        "w-6 h-6 bg-white flex-shrink-0",
                        isPast ? "text-primary" : "text-gray-300",
                      )}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderProgress;
