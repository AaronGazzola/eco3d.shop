"use client";
import { AdminNotificationsToggle } from "@/components/orders/AdminNotificationToggle";
import OrderCard from "@/components/orders/OrderCard";
import { Order } from "@/types/order.types";

const OrdersPage = ({
  orders,
  isAdmin = false,
}: {
  orders?: Order[] | null;
  isAdmin?: boolean;
}) => {
  return (
    <div className="flex flex-col items-center w-full gap-4 p-2 xs:p-4 cursor-default">
      {isAdmin && <AdminNotificationsToggle />}
      {orders?.map((order) => (
        <OrderCard isAdmin={isAdmin} key={order.id} order={order} />
      ))}
    </div>
  );
};

export default OrdersPage;
