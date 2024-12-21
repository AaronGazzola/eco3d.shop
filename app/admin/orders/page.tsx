"use client";
import OrdersPage from "@/components/orders/OrdersPage";
import { useAdminOrdersQuery } from "@/hooks/orderHooks";

const Page = () => {
  const { data } = useAdminOrdersQuery();
  return <OrdersPage orders={data} isAdmin />;
};
export default Page;
