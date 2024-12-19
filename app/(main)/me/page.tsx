"use client";
import OrdersPage from "@/components/orders/OrdersPage";
import { useUserOrdersQuery } from "@/hooks/orderHooks";

const Page = () => {
  const { data } = useUserOrdersQuery();
  return <OrdersPage orders={data} />;
};
export default Page;
