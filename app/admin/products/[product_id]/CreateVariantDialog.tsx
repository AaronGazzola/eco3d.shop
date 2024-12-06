"use client";
import { CreateProductVariantValues } from "@/actions/productVariantActions";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useUpdateManyProductVariants,
  useUpdateProductVariant,
} from "@/hooks/productVariantHooks";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import { Tables } from "@/types/database.types";
import { useState } from "react";

interface Props {
  productVariant: Tables<"product_variants">;
  selectedIds?: string[];
}

export function CreateVariantDialog({ productVariant, selectedIds }: Props) {
  const { dismiss } = useDialogQueue();
  const updateVariant = useUpdateProductVariant();
  const updateManyVariants = useUpdateManyProductVariants();
  const [formData, setFormData] = useState<CreateProductVariantValues>({
    variant_name: productVariant.variant_name || "",
    product_id: productVariant.product_id!,
    stock_quantity: productVariant.stock_quantity || 0,
    estimated_print_seconds: productVariant.estimated_print_seconds || 0,
    custom_attributes:
      typeof productVariant.custom_attributes === "object"
        ? (productVariant.custom_attributes as Record<string, any>)
        : {},
  });

  const onSubmit = async (data: CreateProductVariantValues) => {
    if (selectedIds) {
      await updateManyVariants.mutateAsync({
        ids: selectedIds,
        data: {
          variant_name: data.variant_name,
          stock_quantity: data.stock_quantity,
          estimated_print_seconds: data.estimated_print_seconds,
        },
      });
    } else {
      await updateVariant.mutateAsync({
        updateData: { ...data, id: productVariant.id },
      });
    }
    dismiss();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {selectedIds ? "Edit Selected Variants" : "Edit Variant"}
        </DialogTitle>
        <DialogDescription>
          {selectedIds
            ? `Editing ${selectedIds.length} variants`
            : "Edit this variant"}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Variant Name</Label>
          <Input
            id="name"
            value={formData.variant_name}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                variant_name: e.target.value,
              }))
            }
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="stock">Stock Quantity</Label>
          <Input
            id="stock"
            type="number"
            value={formData.stock_quantity}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                stock_quantity: parseInt(e.target.value),
              }))
            }
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="print_time">Print Time (seconds)</Label>
          <Input
            id="print_time"
            type="number"
            value={formData.estimated_print_seconds || ""}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                estimated_print_seconds: parseInt(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          onClick={() => onSubmit(formData)}
          disabled={updateVariant.isPending}
        >
          {updateVariant.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </>
  );
}
