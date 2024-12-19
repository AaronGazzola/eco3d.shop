"use client";
import OrderCard from "@/components/orders/OrderCard";
import { Order } from "@/types/order.types";

const OrdersPage = ({ orders }: { orders?: Order[] | null }) => {
  return (
    <div className="flex flex-col items-center w-full gap-4 p-2 xs:p-4 cursor-default">
      {orders?.map((order) => <OrderCard key={order.id} order={order} />)}
    </div>
  );
};

export default OrdersPage;
