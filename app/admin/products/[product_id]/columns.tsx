// app/admin/products/[product_id]/columns.tsx
"use client";
import { Button } from "@/components/ui/button";
import { useDeleteProductVariant } from "@/hooks/productVariantHooks";
import { ProductVariant } from "@/types/db.types";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";

const Cell = ({ row }: { row: any }) => {
  const { mutate: deleteVariant } = useDeleteProductVariant();
  return (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm">
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (confirm("Delete this variant?")) {
            deleteVariant(row.original.id);
          }
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const variantColumns: ColumnDef<ProductVariant>[] = [
  {
    accessorKey: "variant_name",
    header: "Name",
  },
  {
    accessorKey: "stock_quantity",
    header: "Stock",
  },
  {
    accessorKey: "custom_attributes",
    header: "Attributes",
    cell: ({ row }) => (
      <pre>{JSON.stringify(row.original.custom_attributes, null, 2)}</pre>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <Cell row={row} />,
  },
];
