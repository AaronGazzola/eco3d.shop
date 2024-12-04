// app/admin/products/[product_id]/page.tsx
import { getProductByIdAction } from "@/actions/productActions";
import { AdminProductPage } from "@/app/admin/products/[product_id]/AdminProductPage";

export default async function ProductPage({
  params,
}: {
  params: { product_id: string };
}) {
  const { data: product, error } = await getProductByIdAction(
    params.product_id,
  );

  if (error) return <div>Error: {error}</div>;
  if (!product) return <div>Product not found</div>;

  return <AdminProductPage product={product} />;
}
