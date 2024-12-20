"use client";
import OrdersPage from "@/components/orders/OrdersPage";
import { useUserOrdersQuery } from "@/hooks/orderHooks";

const Page = () => {
  const { data } = useUserOrdersQuery();
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold px-6 pb-4 pt-8 w-full max-w-3xl ">
        My Orders
      </h1>
      <OrdersPage orders={data} />
    </div>
  );
};
export default Page;
