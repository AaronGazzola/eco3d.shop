// app/admin/product/columns.tsx
"use client";
import ProductDialog from "@/app/admin/products/ProductDialog";
import ProductVariantDialog from "@/app/admin/products/ProductVariantDialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import { ProductWithVariants } from "@/types/db.types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, EditIcon, Plus } from "lucide-react";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
}

const EditCell = ({ row }: { row: Row<ProductWithVariants> }) => {
  const { dialog } = useDialogQueue();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() =>
        dialog(
          <ProductDialog
            productData={{
              id: row.original.id,
              name: row.original.name,
              description: row.original.description,
              variants: row.original.product_variants || [],
            }}
          />
        )
      }
    >
      <EditIcon className="w-4" />
    </Button>
  );
};

const VariantCell = ({ row }: { row: Row<ProductWithVariants> }) => {
  const { dialog } = useDialogQueue();
  return (
    <Collapsible className="flex flex-col">
      <Button
        variant="ghost"
        className="flex gap-2 w-min"
        onClick={() => dialog(<ProductVariantDialog />)}
      >
        <span>Add variant</span> <Plus className="w-4" />
      </Button>
      {row.original.product_variants?.length && (
        <CollapsibleTrigger className="w-full">
          <Button
            variant="ghost"
            className="flex gap-2 w-full"
          >
            <span>Show {row.original.product_variants?.length} Variants</span>
            <ChevronDown className="w-4" />
          </Button>
        </CollapsibleTrigger>
      )}
      <CollapsibleContent>
        <div className="flex flex-col">
          {row.original.product_variants?.map((variant) => (
            <div
              key={variant.id}
              className="flex justify-between"
            >
              <div>{variant.variant_name}</div>
              <div>{variant.stock_quantity}</div>
              <div>{variant.estimated_print_seconds}</div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const productColumns: ColumnDef<ProductWithVariants>[] = [
  {
    id: "edit",
    header: "Edit",
    cell: ({ row }) => <EditCell row={row} />,
  },
  {
    accessorKey: "name",
    header: "Product Name",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    id: "variants",
    header: "Variants",
    cell: ({ row }) => <VariantCell row={row} />,
  },
];

export function ProductTable<TData>({
  columns,
  data,
}: DataTableProps<ProductWithVariants>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const { dialog } = useDialogQueue();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center"
              >
                No products found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
