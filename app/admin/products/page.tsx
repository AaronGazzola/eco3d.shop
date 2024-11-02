"use client";

import ProductDialog from "@/app/admin/products/ProductDialog";
import {
  ProductTable,
  productColumns,
} from "@/app/admin/products/ProductTable";
import ActionButton from "@/components/layout/ActionButton";
import { useGetProducts } from "@/hooks/productHooks";
import { useDialogQueue } from "@/hooks/useDialogQueue";

const ProductPage = () => {
  const { dialog } = useDialogQueue();
  const { data: products } = useGetProducts();

  const data =
    products?.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      variants: product.product_variants.map((variant) => ({
        id: variant.id,
        variantName: variant.variant_name,
        stockQuantity: variant.stock_quantity,
        estimatedPrintTime: variant.estimated_print_time,
      })),
    })) ?? [];

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between pb-3">
        <ActionButton onClick={() => dialog(<ProductDialog />)}>
          Add Product
        </ActionButton>
      </div>
      <ProductTable
        columns={productColumns}
        data={data}
      />
    </div>
  );
};

export default ProductPage;
