import OrderCountdown from "@/components/orders/OrderCountdown";
import { cn } from "@/lib/utils";
import {
  Order,
  OrderStatus,
  REFUND_STAGES,
  RefundStatus,
} from "@/types/order.types";
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
  order: Order;
}

const OrderProgress = ({
  status,
  isRefund,
  trackingNumber,
  order,
}: OrderProgressProps) => {
  const getProgressWidth = (
    currentStatus: OrderStatus | RefundStatus,
    isRefundProgress: boolean,
  ) => {
    if (isRefundProgress) {
      const refundPositions: Record<RefundStatus, string> = {
        pending: "25%",
        processing: "50%",
        processed: "100%",
      };
      return refundPositions[currentStatus as RefundStatus] || "0%";
    }

    const orderPositions: Record<OrderStatus, string> = {
      waiting: "25%",
      printing: "50%",
      packing: "75%",
      shipped: "100%",
      delivered: "100%",
    };
    return orderPositions[currentStatus as OrderStatus] || "0%";
  };

  const isStatusCompleted = (iconStatus: OrderStatus | RefundStatus) => {
    if (isRefund) {
      return (
        REFUND_STAGES.indexOf(status as RefundStatus) >
        REFUND_STAGES.indexOf(iconStatus as RefundStatus)
      );
    }

    const orderStatuses = [
      OrderStatus.Waiting,
      OrderStatus.Printing,
      OrderStatus.Packing,
      OrderStatus.Shipped,
      OrderStatus.Delivered,
    ];

    return (
      orderStatuses.indexOf(status as OrderStatus) >
      orderStatuses.indexOf(iconStatus as OrderStatus)
    );
  };

  if (isRefund) {
    const icons = [
      { icon: ArrowLeftRight, label: "Requested" },
      { icon: CircleDot, label: "Processing" },
      { icon: CheckCircle2, label: "Complete" },
    ];

    return (
      <div className="w-full">
        <div className="flex">
          {REFUND_STAGES.map((stage, index) => (
            <div
              key={stage}
              className="flex flex-col items-center gap-2 font-bold text-primary pb-4 w-[33%]"
            >
              {stage === status && (
                <h3 className="text-center capitalize">
                  {stage.toLowerCase()}
                </h3>
              )}
            </div>
          ))}
        </div>
        <div className="relative">
          <div className="absolute w-full h-1 bg-gray-200 rounded">
            <div
              className="absolute h-full bg-primary rounded transition-all duration-500"
              style={{ width: getProgressWidth(status as RefundStatus, true) }}
            />
          </div>
          <div className="flex w-full pt-5">
            {icons.map(({ icon: Icon }, index) => (
              <div key={index} className="flex flex-col items-center flex-grow">
                <Icon
                  className={cn(
                    "w-6 h-6 bg-white",
                    index <= REFUND_STAGES.indexOf(status as RefundStatus)
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
    { icon: Clock, status: OrderStatus.Waiting, label: "Queued" },
    { icon: Printer, status: OrderStatus.Printing, label: "Printing" },
    { icon: Package, status: OrderStatus.Packing, label: "Processing" },
    { icon: Truck, status: OrderStatus.Shipped, label: "Dispatched" },
  ];

  return (
    <div className="w-full mt-6">
      <div className="flex w-full">
        {icons.map(({ status: iconStatus, label }) => (
          <div
            key={iconStatus}
            className="flex flex-col items-center gap-2 font-bold text-primary pb-4 w-[25%]"
          >
            {status === iconStatus && <h3 className="text-center">{label}</h3>}
          </div>
        ))}
      </div>
      <div className="relative">
        <div className="absolute w-full h-1 bg-gray-200 rounded">
          <div
            className="absolute h-full bg-primary rounded transition-all duration-500"
            style={{ width: getProgressWidth(status as OrderStatus, false) }}
          />
        </div>
        <div className="flex">
          {icons.map(({ icon: Icon, status: iconStatus }) => {
            const isActive = status === iconStatus;
            const isShipped = iconStatus === OrderStatus.Shipped;
            const isCompleted = isStatusCompleted(iconStatus);
            const shouldBeGreen =
              status === OrderStatus.Shipped
                ? iconStatus === OrderStatus.Shipped
                : isCompleted;

            return (
              <div
                key={iconStatus}
                style={{ width: "25%" }}
                className="flex flex-col items-center gap-2"
              >
                <div className="whitespace-nowrap px-2.5 py-1.5 flex flex-col items-center text-primary font-semibold relative w-full gap-5 pt-6 justify-end h-full">
                  {(iconStatus === OrderStatus.Waiting ||
                    iconStatus === OrderStatus.Printing) &&
                    isActive && <OrderCountdown order={order} />}
                  {isShipped && trackingNumber && (
                    <Link
                      href={`https://auspost.com.au/mypost/track/details/${trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 underline"
                    >
                      <span>Track Order</span>
                      <SquareArrowOutUpRight className="mt-0.5 w-4 h-4 stroke-2" />
                    </Link>
                  )}
                  {status === OrderStatus.Delivered &&
                  iconStatus === OrderStatus.Shipped ? (
                    <PackageOpen
                      className={cn(
                        "w-6 h-6 bg-white flex-shrink-0",
                        "text-primmary",
                      )}
                    />
                  ) : (
                    <Icon
                      className={cn(
                        "w-6 h-6 bg-white flex-shrink-0",
                        shouldBeGreen
                          ? "text-primmary"
                          : isActive
                            ? "text-primary"
                            : "text-gray-300",
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
