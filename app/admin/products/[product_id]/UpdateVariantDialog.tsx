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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface PrintTime {
  days: number;
  hours: number;
  minutes: number;
}

export function UpdateVariantDialog({ productVariant, selectedIds }: Props) {
  const { dismiss } = useDialogQueue();
  const updateVariant = useUpdateProductVariant();
  const updateManyVariants = useUpdateManyProductVariants();

  const initialPrintTime = () => {
    const seconds = productVariant.estimated_print_seconds || 0;
    return {
      days: Math.floor(seconds / (24 * 3600)),
      hours: Math.floor((seconds % (24 * 3600)) / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
    };
  };

  const [printTime, setPrintTime] = useState<PrintTime>(initialPrintTime());
  const [formData, setFormData] = useState<CreateProductVariantValues>({
    variant_name: productVariant.variant_name || "",
    product_id: productVariant.product_id!,
    estimated_print_seconds: productVariant.estimated_print_seconds || 0,
    attributes:
      typeof productVariant.attributes === "object"
        ? (productVariant.attributes as Record<string, any>)
        : {},
  });

  const calculateTotalSeconds = (time: PrintTime) => {
    return time.days * 24 * 3600 + time.hours * 3600 + time.minutes * 60;
  };

  const onSubmit = async (data: CreateProductVariantValues) => {
    const totalSeconds = calculateTotalSeconds(printTime);
    const submitData = {
      ...data,
      estimated_print_seconds: totalSeconds,
    };

    if (selectedIds) {
      await updateManyVariants.mutateAsync({
        ids: selectedIds,
        data: {
          variant_name: submitData.variant_name,
          estimated_print_seconds: submitData.estimated_print_seconds,
        },
      });
    } else {
      await updateVariant.mutateAsync({
        updateData: { ...submitData, id: productVariant.id },
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
            onChange={(e) =>
              setFormData((prev) => ({
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
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                stock_quantity: parseInt(e.target.value),
              }))
            }
          />
        </div>

        <div className="grid gap-2">
          <Label>Print Time</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={printTime.days.toString()}
                onValueChange={(value) =>
                  setPrintTime((prev) => ({ ...prev, days: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Days" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i} {i === 1 ? "day" : "days"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select
                value={printTime.hours.toString()}
                onValueChange={(value) =>
                  setPrintTime((prev) => ({ ...prev, hours: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hours" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i} {i === 1 ? "hour" : "hours"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select
                value={printTime.minutes.toString()}
                onValueChange={(value) =>
                  setPrintTime((prev) => ({
                    ...prev,
                    minutes: parseInt(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Minutes" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 60 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i} {i === 1 ? "minute" : "minutes"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
