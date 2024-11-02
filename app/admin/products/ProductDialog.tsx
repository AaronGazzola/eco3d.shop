"use client";

import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import ActionButton from "@/components/layout/ActionButton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateProduct,
  useDeleteProduct,
  useUpdateProduct,
} from "@/hooks/productHooks";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useEffect } from "react";

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Product name must be at least 2 characters." }),
  description: z.string().optional(),
});

type ProductDialogProps = {
  productData?: {
    id?: string;
    name: string;
    description?: string;
  };
};

const ProductDialog = ({ productData }: ProductDialogProps) => {
  const isEdit = Boolean(productData);
  const { dismiss } = useDialogQueue();

  const {
    mutate: deleteProduct,
    isPending: isDeleting,
    reset: resetDelete,
    isSuccess: isDeleted,
  } = useDeleteProduct();
  const {
    mutate: createProduct,
    isPending: isCreating,
    isSuccess: isCreated,
    reset: resetCreate,
  } = useCreateProduct();
  const {
    mutate: updateProduct,
    isPending: isUpdating,
    isSuccess: isUpdated,
    reset: resetUpdate,
  } = useUpdateProduct();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: productData?.name || "",
      description: productData?.description || "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (isEdit && productData?.id) {
      return updateProduct({
        updateData: { id: productData.id, ...values },
      });
    }
    createProduct(values);
  }

  useEffect(() => {
    if (isDeleted || isCreated || isUpdated) dismiss();
    if (isCreated) resetCreate();
    if (isDeleted) resetDelete();
    if (isUpdated) resetUpdate();
  }, [
    isDeleted,
    dismiss,
    isCreated,
    isUpdated,
    resetCreate,
    resetDelete,
    resetUpdate,
  ]);

  return (
    <>
      <DialogTitle className="text-lg font-medium">
        {isEdit ? "Edit Product" : "Add Product"}
      </DialogTitle>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8"
        >
          {/* Product Name Field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Product Name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Product Description Field */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Product Description"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between">
            {isEdit && (
              <ActionButton
                type="button"
                variant="destructive"
                onClick={() => deleteProduct(productData?.id!)}
                isPending={isDeleting}
              >
                Delete
              </ActionButton>
            )}
            <ActionButton
              type="submit"
              className={cn(!isEdit && "w-full")}
              isPending={isEdit ? isUpdating : isCreating}
            >
              {isEdit ? "Update" : "Create"}
            </ActionButton>
          </div>
        </form>
      </Form>
    </>
  );
};

export default ProductDialog;
