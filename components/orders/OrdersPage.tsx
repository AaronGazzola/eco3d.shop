// OrdersPage.tsx
"use client";
import OrderCard from "@/components/orders/OrderCard";
import {
  ORDER_STAGES,
  Order,
  OrderStatus,
  REFUND_STAGES,
  RefundStatus,
} from "@/types/order.types";
import { useState } from "react";
import { mockOrders } from "./mockOrderData";

const OrdersList = () => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  const handleUpdateStatus = (orderId: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== orderId) return order;
        const currentStatus = order.status;
        if (order.isRefund) {
          const currentIndex = REFUND_STAGES.indexOf(
            currentStatus as RefundStatus,
          );
          const nextStatus =
            REFUND_STAGES[(currentIndex + 1) % REFUND_STAGES.length];
          return { ...order, status: nextStatus };
        } else {
          const currentIndex = ORDER_STAGES.indexOf(
            currentStatus as OrderStatus,
          );
          const nextStatus =
            ORDER_STAGES[(currentIndex + 1) % ORDER_STAGES.length];
          return { ...order, status: nextStatus };
        }
      }),
    );
  };

  const handleRequestRefund = (orderId: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId
          ? { ...order, status: RefundStatus.Pending, isRefund: true }
          : order,
      ),
    );
  };

  return (
    <div className="flex flex-col items-center w-full gap-4 p-2 xs:p-4 cursor-default">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onRequestRefund={handleRequestRefund}
          onUpdateStatus={handleUpdateStatus}
        />
      ))}
    </div>
  );
};

export default OrdersList;
