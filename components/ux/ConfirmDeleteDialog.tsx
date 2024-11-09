import ActionButton from "@/components/layout/ActionButton";
import { useDeleteProduct } from "@/hooks/productHooks";
import { useDeletePromoCodeAndKey } from "@/hooks/promoHooks";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import { Database } from "@/types/database.types";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useEffect } from "react";

const ConfirmDeleteDialog = ({
  name,
  id,
  table,
}: {
  name: string;
  id: string;
  table: keyof Database["public"]["Tables"];
}) => {
  const { dismiss } = useDialogQueue();
  const isProduct = table === "products";
  const isPromoCode = table === "promo_codes";

  const {
    isPending: productIsLoading,
    isSuccess: productIsDeleted,
    mutate: deleteProduct,
  } = useDeleteProduct();
  const {
    isPending: promoCodeIsLoading,
    isSuccess: promoCodeIsDeleted,
    mutate: deletePromoCodeAndKey,
  } = useDeletePromoCodeAndKey();

  const loading = isProduct ? productIsLoading : promoCodeIsLoading;

  useEffect(() => {
    if (productIsDeleted && isProduct) dismiss();
    if (promoCodeIsDeleted && isPromoCode) dismiss();
  }, [
    productIsDeleted,
    promoCodeIsDeleted,
    table,
    dismiss,
    isProduct,
    isPromoCode,
  ]);

  return (
    <>
      <DialogTitle className="text-lg font-medium">
        Are you sure you want to delete <strong>{name}</strong>?
      </DialogTitle>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (isProduct) deleteProduct(id);
          if (isPromoCode) deletePromoCodeAndKey(id);
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
