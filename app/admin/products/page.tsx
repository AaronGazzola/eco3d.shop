"use server";

import { getProductsAction } from "@/actions/productActions";
import AdminProductsPage from "@/app/admin/products/AdminProductsPage";

export default async function Page() {
  const { data: products } = await getProductsAction();
  return <AdminProductsPage products={products} />;
}
