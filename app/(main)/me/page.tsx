"use server";
import { getUserOrdersAction } from "@/actions/orderActions";
import OrdersPage from "@/components/orders/OrdersPage";

const Page = async () => {
  const { data: orders } = await getUserOrdersAction();
  return <OrdersPage initialOrders={orders || []} />;
};
export default Page;
