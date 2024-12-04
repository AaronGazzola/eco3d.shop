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
import { Tables } from "@/types/database.types";
import { useState } from "react";

interface Props {
  productVariant: Tables<"product_variants">;
}

export function CreateVariantDialog({ productVariant }: Props) {
  const [formData, setFormData] = useState<CreateProductVariantValues>({
    variant_name: "",
    product_id: productVariant.id,
    stock_quantity: 0,
    custom_attributes: {},
  });

  const onSubmit = (data: CreateProductVariantValues) => {};

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Variant</DialogTitle>
        <DialogDescription>
          Add a new variant for this product
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
          <Label htmlFor="stock">Initial Stock</Label>
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
        <Button onClick={() => onSubmit(formData)}>Create Variant</Button>
      </DialogFooter>
    </>
  );
}
