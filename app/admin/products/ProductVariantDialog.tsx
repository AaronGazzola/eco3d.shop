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
  useCreateProductVariant,
  useDeleteProductVariant,
  useUpdateProductVariant,
} from "@/hooks/productVariantHooks";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import { Tables } from "@/types/database.types";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useEffect } from "react";

const variantFormSchema = z.object({
  variant_name: z
    .string()
    .min(2, { message: "Variant name must be at least 2 characters." }),
  stock_quantity: z
    .number()
    .min(0, { message: "Stock quantity must be at least 0" }),
  estimated_print_seconds: z.number().optional(),
  custom_attributes: z.string().optional(),
  print_queue_id: z.string().optional(),
});

const ProductVariantDialog = ({
  variantData,
}: {
  variantData?: Partial<Tables<"product_variants">>;
}) => {
  const isEdit = Boolean(variantData);
  const { dismiss } = useDialogQueue();

  const {
    mutate: deleteVariant,
    isPending: isDeleting,
    reset: resetDelete,
    isSuccess: isDeleted,
  } = useDeleteProductVariant();
  const {
    mutate: createVariant,
    isPending: isCreating,
    isSuccess: isCreated,
    reset: resetCreate,
  } = useCreateProductVariant();
  const {
    mutate: updateVariant,
    isPending: isUpdating,
    isSuccess: isUpdated,
    reset: resetUpdate,
  } = useUpdateProductVariant();

  const form = useForm<z.infer<typeof variantFormSchema>>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: {
      variant_name: variantData?.variant_name || "",
      stock_quantity: variantData?.stock_quantity || 0,
      estimated_print_seconds:
        variantData?.estimated_print_seconds || undefined,
      custom_attributes: JSON.stringify(variantData?.custom_attributes || ""),
      print_queue_id: variantData?.print_queue_id || "",
    },
  });

  function onSubmit(values: z.infer<typeof variantFormSchema>) {
    const formattedValues = {
      ...values,
      custom_attributes: values.custom_attributes
        ? JSON.parse(values.custom_attributes)
        : null,
      product_id: variantData?.product_id || "",
    };
    if (isEdit && variantData?.id) {
      return updateVariant({
        updateData: { id: variantData.id, ...formattedValues },
      });
    }
    createVariant(formattedValues);
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
        {isEdit ? "Edit Variant" : "Add Variant"}
      </DialogTitle>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8"
        >
          {/* Variant Name Field */}
          <FormField
            control={form.control}
            name="variant_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variant Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Variant Name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Stock Quantity Field */}
          <FormField
            control={form.control}
            name="stock_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Stock Quantity"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estimated Print Seconds Field */}
          <FormField
            control={form.control}
            name="estimated_print_seconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Print Seconds</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Estimated Print Seconds"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Custom Attributes Field */}
          <FormField
            control={form.control}
            name="custom_attributes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Attributes (JSON)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='{"key": "value"}'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Print Queue ID Field */}
          <FormField
            control={form.control}
            name="print_queue_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Print Queue ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Print Queue ID"
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
                onClick={() => deleteVariant(variantData?.id!)}
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

export default ProductVariantDialog;
