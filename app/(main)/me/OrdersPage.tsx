// OrdersPage.tsx
"use client";
import OrderCard from "@/app/(main)/me/OrderCard";
import {
  ORDER_STAGES,
  Order,
  OrderStatus,
  REFUND_STAGES,
  RefundStatus,
} from "@/types/order.types";
import { useState } from "react";

const OrdersList = () => {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: "1",
      status: OrderStatus.Waiting,
      isRefund: false,
      startTime: new Date(),
      recipientName: "John Doe",
      addressLine1: "123 Main St",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "USA",
      totalPrice: 99.99,
      currency: "USD",
      createdAt: new Date(),
      items: [
        {
          id: 1,
          name: "V8 Engine",
          imageUrl: "/images/products/V8/small/Set 3 second shoot-27.jpg",
          size: "Small",
          colors: ["Natural", "Black", "White"],
          primaryText: ["Merry", "Christmas", "Grandpa"],
          secondaryText: "From Aaron",
          price: 19.99,
          quantity: 1,
        },
      ],
    },
    {
      id: "2",
      status: OrderStatus.Shipped,
      isRefund: false,
      startTime: new Date(),
      recipientName: "John Doe",
      addressLine1: "123 Main St",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "USA",
      totalPrice: 99.99,
      currency: "USD",
      createdAt: new Date(),
      items: [
        {
          id: 1,
          name: "V8 Engine",
          imageUrl: "/images/products/V8/small/Set 3 second shoot-27.jpg",
          size: "Small",
          colors: ["Natural", "Black", "White"],
          primaryText: ["Merry", "Christmas", "Grandpa"],
          secondaryText: "From Aaron",
          price: 19.99,
          quantity: 1,
        },
      ],
    },
  ]);

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
    <div className="flex flex-col items-center w-full gap-4 p-4 cursor-default">
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
