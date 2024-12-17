"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  CheckCircle2,
  CircleDot,
  Clock,
  Package,
  Printer,
  SquareArrowOutUpRight,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

enum OrderStatus {
  Waiting = "waiting",
  Printing = "printing",
  Shipped = "shipped",
  Delivered = "delivered",
}

enum RefundStatus {
  Pending = "pending",
  Processing = "processing",
  Processed = "processed",
}

const ORDER_STAGES = [
  OrderStatus.Waiting,
  OrderStatus.Printing,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
];

const REFUND_STAGES = [
  RefundStatus.Pending,
  RefundStatus.Processing,
  RefundStatus.Processed,
];

interface Order {
  id: string;
  status: OrderStatus | RefundStatus;
  isRefund: boolean;
  startTime?: Date;
  trackingNumber?: string;
}

const OrdersList = () => {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: "1",
      status: OrderStatus.Waiting,
      isRefund: false,
      startTime: new Date(),
    },
    { id: "2", status: RefundStatus.Pending, isRefund: true },
    {
      id: "3",
      status: OrderStatus.Printing,
      isRefund: false,
      startTime: new Date(Date.now() - 86400000),
    },
  ]);

  const getNextStatus = (
    current: OrderStatus | RefundStatus,
    isRefund: boolean,
  ): OrderStatus | RefundStatus => {
    if (isRefund) {
      const currentIndex = REFUND_STAGES.indexOf(current as RefundStatus);
      return REFUND_STAGES[(currentIndex + 1) % REFUND_STAGES.length];
    } else {
      const currentIndex = ORDER_STAGES.indexOf(current as OrderStatus);
      return ORDER_STAGES[(currentIndex + 1) % ORDER_STAGES.length];
    }
  };

  const handleClick = (orderId: string) => {
    setOrders(
      orders.map((order) =>
        order.id === orderId
          ? { ...order, status: getNextStatus(order.status, order.isRefund) }
          : order,
      ),
    );
  };

  const getTimeDiff = (startTime: Date) => {
    const diff = Math.max(0, Date.now() - startTime.getTime());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  const getProgressWidth = (
    status: OrderStatus | RefundStatus,
    isRefund: boolean,
  ) => {
    if (isRefund) {
      const positions = {
        [RefundStatus.Pending]: "33%",
        [RefundStatus.Processing]: "66%",
        [RefundStatus.Processed]: "100%",
      };
      return positions[status as RefundStatus];
    } else {
      const positions = {
        [OrderStatus.Waiting]: "25%",
        [OrderStatus.Printing]: "50%",
        [OrderStatus.Shipped]: "75%",
        [OrderStatus.Delivered]: "100%",
      };
      return positions[status as OrderStatus];
    }
  };

  const renderStandardProgress = (order: Order) => {
    const icons = [
      { icon: Clock, status: OrderStatus.Waiting },
      { icon: Printer, status: OrderStatus.Printing },
      { icon: Truck, status: OrderStatus.Shipped },
      { icon: Package, status: OrderStatus.Delivered },
    ];

    return (
      <div className="w-full mt-4 flex flex-col items-stretch">
        <div className="flex">
          {icons.map(({ icon: Icon, status }) => {
            const isActive = order.status === status;
            const isPast =
              getProgressWidth(order.status, false) >=
              getProgressWidth(status, false);
            return (
              <div
                style={{ width: getProgressWidth(order.status, false) }}
                key={status}
                className="flex flex-col items-center gap-2 font-bold text-primary pb-2"
              >
                {!isActive ? null : status === OrderStatus.Waiting ? (
                  <h3>Waiting in queue</h3>
                ) : status === OrderStatus.Printing ? (
                  <h3>Printing</h3>
                ) : status === OrderStatus.Shipped ? (
                  <h3>Shipped</h3>
                ) : (
                  <h3>Delivered</h3>
                )}
              </div>
            );
          })}
        </div>
        <div className="relative">
          <div className="absolute w-full h-1 bg-gray-200 rounded">
            <div
              className="absolute h-full bg-primary rounded transition-all duration-500"
              style={{ width: getProgressWidth(order.status, false) }}
            />
          </div>
        </div>

        <div className="flex">
          {icons.map(({ icon: Icon, status }) => {
            const isActive = order.status === status;
            const isPast =
              getProgressWidth(order.status, false) >=
              getProgressWidth(status, false);
            const trackingContent = (
              <>
                <div className="flex items-center justify-center gap-2">
                  <span>Track package</span>
                  <SquareArrowOutUpRight className="mt-0.5 w-4 h-4 stroke-2" />
                </div>
              </>
            );
            const trackingLink = !isActive ? (
              trackingContent
            ) : (
              <Link
                rel="noopener noreferrer"
                target="_blank"
                href="https://google.com"
              >
                {trackingContent}
              </Link>
            );
            return (
              <div
                style={{ width: getProgressWidth(order.status, false) }}
                key={status}
                className="flex flex-col items-center w-[25%] gap-2"
              >
                <div
                  className={cn(
                    "text-sm whitespace-nowrap px-2.5 py-1.5 flex flex-col items-center  text-primary font-semibold relative w-full gap-3 pt-5 justify-end h-full",
                  )}
                >
                  {order.status !== OrderStatus.Delivered && (
                    <div
                      className={cn(
                        "border-2 rounded-full items-center justify-center py-1.5 flex",
                        !isActive && "opacity-0",
                        status === OrderStatus.Shipped
                          ? "rounded-none border-transparent border-b-secondary text-secondary px-1"
                          : "border-green-700 px-3.5",
                      )}
                    >
                      {status === OrderStatus.Waiting ||
                      status === OrderStatus.Printing
                        ? "00:28:28:29"
                        : status === OrderStatus.Shipped
                          ? trackingLink
                          : ""}
                    </div>
                  )}

                  <Icon
                    className={cn(
                      "w-6 h-6 bg-white flex-shrink-0",
                      isPast ? "text-primary" : "text-gray-300",
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRefundProgress = (order: Order) => {
    const icons = [
      { icon: ArrowLeftRight, status: RefundStatus.Pending },
      { icon: CircleDot, status: RefundStatus.Processing },
      { icon: CheckCircle2, status: RefundStatus.Processed },
    ];

    return (
      <div className="w-full mt-4">
        <div className="flex">
          {icons.map(({ icon: Icon, status }) => {
            const isActive = order.status === status;
            return (
              <div
                style={{ width: getProgressWidth(order.status, true) }}
                key={status}
                className="flex flex-col items-center gap-2 font-bold text-primary pb-2"
              >
                {!isActive ? null : status === RefundStatus.Pending ? (
                  <h3>Refund Requested</h3>
                ) : status === RefundStatus.Processing ? (
                  <h3>Processing Refund</h3>
                ) : (
                  <h3>Refund Complete</h3>
                )}
              </div>
            );
          })}
        </div>
        <div className="relative">
          <div className="absolute w-full h-1 bg-gray-200 rounded">
            <div
              className="absolute h-full bg-primary rounded transition-all duration-500"
              style={{ width: getProgressWidth(order.status, true) }}
            />
          </div>
          <div className="flex w-full pt-5">
            {icons.map(({ icon: Icon, status }) => (
              <div
                key={status}
                className="flex flex-col items-center flex-grow"
              >
                <Icon
                  className={cn(
                    "w-6 h-6 bg-white",
                    getProgressWidth(order.status, true) >=
                      getProgressWidth(status, true)
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
  };

  return (
    <div className="flex flex-col items-center w-full gap-4 p-4">
      {orders.map((order) => (
        <Card
          key={order.id}
          className="w-full max-w-3xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleClick(order.id)}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Order #{order.id}</h3>
          </div>
          {order.isRefund
            ? renderRefundProgress(order)
            : renderStandardProgress(order)}
        </Card>
      ))}
    </div>
  );
};

export default OrdersList;
