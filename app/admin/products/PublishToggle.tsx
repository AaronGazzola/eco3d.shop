"use client";

import { Switch } from "@/components/ui/switch";
import ConfirmDialog from "@/components/ux/ConfirmDialog";
import { useUpdateProduct } from "@/hooks/productHooks";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import { Product } from "@/types/db.types";

export const PublishToggle = ({ product }: { product: Product }) => {
  const { dialog } = useDialogQueue();
  const { mutate: updateProduct } = useUpdateProduct();

  const handleToggle = () => {
    dialog(
      <ConfirmDialog
        title={`${product.published ? "Unpublish" : "Publish"} ${product.name}?`}
        description={`Are you sure you want to ${product.published ? "unpublish" : "publish"} this product?`}
        onConfirm={() => {
          updateProduct({
            updateData: {
              id: product.id,
              published: !product.published,
            },
          });
        }}
      />,
    );
  };

  return (
    <Switch checked={!!product.published} onCheckedChange={handleToggle} />
  );
};
