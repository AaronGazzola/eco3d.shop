import ActionButton from "@/components/layout/ActionButton";
import { useDeleteProduct } from "@/hooks/productHooks";
import {
  useDeleteManyProductVariants,
  useDeleteProductVariant,
} from "@/hooks/productVariantHooks";
import { useDeletePromoCodeAndKey } from "@/hooks/promoHooks";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import { Database } from "@/types/database.types";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useEffect } from "react";

const ConfirmDeleteDialog = ({
  name,
  id,
  ids,
  table,
  onConfirm,
}: {
  name: string;
  id?: string;
  ids?: string[];
  table: keyof Database["public"]["Tables"];
  onConfirm?: () => Promise<void>;
}) => {
  const { dismiss } = useDialogQueue();
  const isProduct = table === "products";
  const isProductVariant = table === "product_variants";
  const isPromoCode = table === "promo_codes";

  const {
    isPending: productIsLoading,
    isSuccess: productIsDeleted,
    mutate: deleteProduct,
  } = useDeleteProduct();

  const {
    isPending: productVariantIsLoading,
    isSuccess: productVariantIsDeleted,
    mutate: deleteProductVariant,
  } = useDeleteProductVariant();

  const {
    isPending: manyProductVariantsIsLoading,
    isSuccess: manyProductVariantsDeleted,
    mutate: deleteManyProductVariants,
  } = useDeleteManyProductVariants();

  const {
    isPending: promoCodeIsLoading,
    isSuccess: promoCodeIsDeleted,
    mutate: deletePromoCodeAndKey,
  } = useDeletePromoCodeAndKey();

  const loading = isProduct
    ? productIsLoading
    : isProductVariant
      ? ids
        ? manyProductVariantsIsLoading
        : productVariantIsLoading
      : promoCodeIsLoading;

  useEffect(() => {
    if (productIsDeleted && isProduct) dismiss();
    if (promoCodeIsDeleted && isPromoCode) dismiss();
    if (
      (productVariantIsDeleted || manyProductVariantsDeleted) &&
      isProductVariant
    )
      dismiss();
  }, [
    productIsDeleted,
    promoCodeIsDeleted,
    manyProductVariantsDeleted,
    productVariantIsDeleted,
    table,
    dismiss,
    isProduct,
    isPromoCode,
    isProductVariant,
  ]);

  return (
    <>
      <DialogTitle className="text-lg font-medium">
        Are you sure you want to delete <strong>{name}</strong>?
      </DialogTitle>
      <form
        onSubmit={async e => {
          e.preventDefault();
          if (onConfirm) {
            await onConfirm();
            dismiss();
            return;
          }
          if (isProduct && id) deleteProduct(id);
          if (isPromoCode && id) deletePromoCodeAndKey(id);
          if (isProductVariant) {
            if (ids) {
              deleteManyProductVariants(ids);
            } else if (id) {
              deleteProductVariant({ id });
            }
          }
        }}
      >
        <div className="flex w-full justify-between items-center">
          <ActionButton variant="outline" type="button" onClick={dismiss}>
            Cancel
          </ActionButton>
          <ActionButton variant="destructive" type="submit" loading={loading}>
            Delete
          </ActionButton>
        </div>
      </form>
    </>
  );
};

export default ConfirmDeleteDialog;
