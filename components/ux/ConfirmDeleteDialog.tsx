import ActionButton from "@/components/layout/ActionButton";
import { useDeleteProduct } from "@/hooks/productHooks";
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
  //   TODO: extend this for other tables:
  const {
    isPending: loading,
    isSuccess: deleted,
    mutate: deleteProduct,
  } = useDeleteProduct();
  useEffect(() => {
    if (deleted) dismiss();
  }, [deleted, dismiss]);
  return (
    <>
      <DialogTitle className="text-lg font-medium">
        Are you sure you want to delete <strong>{name}</strong>?
      </DialogTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          deleteProduct(id);
        }}
      >
        <div className="flex w-full justify-between items-center">
          <ActionButton
            variant="outline"
            type="button"
            onClick={dismiss}
          >
            Cancel
          </ActionButton>
          <ActionButton
            variant="destructive"
            type="submit"
            loading={loading}
          >
            Delete
          </ActionButton>
        </div>
      </form>
    </>
  );
};

export default ConfirmDeleteDialog;
