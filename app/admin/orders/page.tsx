"use server";
import { getAdminOrdersAction } from "@/actions/orderActions";
import OrdersPage from "@/components/orders/OrdersPage";

const Page = async () => {
  const { data: orders } = await getAdminOrdersAction();
  return <OrdersPage initialOrders={orders || []} />;
};
export default Page;
