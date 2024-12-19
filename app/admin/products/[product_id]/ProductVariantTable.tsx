"use client";
import { UpdateVariantDialog } from "@/app/admin/products/[product_id]/UpdateVariantDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmDeleteDialog from "@/components/ux/ConfirmDeleteDialog";
import { useGetProductVariants } from "@/hooks/productVariantHooks";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import { ProductVariantWithImages } from "@/types/db.types";
import { DataTableProps } from "@/types/ui.types";
import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { EditIcon, Trash2 } from "lucide-react";

const EditCell = ({ row }: { row: Row<ProductVariantWithImages> }) => {
  const { dialog } = useDialogQueue();
  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          dialog(<UpdateVariantDialog productVariant={row.original} />);
        }}
      >
        <EditIcon className="w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          dialog(
            <ConfirmDeleteDialog
              name={row.original.variant_name}
              id={row.original.id}
              table="product_variants"
            />,
          );
        }}
      >
        <Trash2 className="w-4" />
      </Button>
    </div>
  );
};

const AttributesCell = ({ row }: { row: Row<ProductVariantWithImages> }) => {
  const attributes = row.original.attributes;
  if (!attributes) return null;
  return (
    <pre className="text-xs">
      {Object.entries(attributes as Record<string, string>)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}
    </pre>
  );
};

export const variantColumns: ColumnDef<ProductVariantWithImages>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "edit",
    header: "Actions",
    cell: EditCell,
  },
  {
    accessorKey: "variant_name",
    header: "Variant Name",
  },
  {
    accessorKey: "stock_quantity",
    header: "Stock",
  },
  {
    accessorKey: "attributes",
    header: "Attributes",
    cell: AttributesCell,
  },
  {
    accessorKey: "estimated_print_seconds",
    header: "Print Time",
    cell: ({ row }) => {
      const seconds = row.original.estimated_print_seconds || 0;
      const days = Math.floor(seconds / (24 * 3600));
      const hours = Math.floor((seconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      const parts = [];
      if (days) parts.push(`${days}d`);
      if (hours) parts.push(`${hours}h`);
      if (minutes) parts.push(`${minutes}m`);

      return parts.length ? parts.join(" ") : "0m";
    },
  },
];

export function ProductVariantTable({
  columns,
  data,
}: DataTableProps<ProductVariantWithImages>) {
  const { data: variants } = useGetProductVariants(data?.[0]?.product_id, data);
  const { dialog } = useDialogQueue();

  const table = useReactTable({
    data: variants || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
  });

  const handleBulkDelete = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const ids = selectedRows.map((row) => row.original.id);
    dialog(
      <ConfirmDeleteDialog
        name={`${selectedRows.length} variants`}
        ids={ids}
        table="product_variants"
      />,
    );
  };

  const handleBulkEdit = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const selectedIds = selectedRows.map((row) => row.original.id);
    dialog(
      <UpdateVariantDialog
        productVariant={selectedRows[0].original}
        selectedIds={selectedIds}
      />,
    );
  };

  return (
    <div>
      <div className="flex gap-2 mt-3 mb-4">
        <Button
          onClick={handleBulkEdit}
          disabled={!table.getSelectedRowModel().rows.length}
        >
          Edit Selected ({table.getSelectedRowModel().rows.length})
        </Button>
        <Button
          disabled={!table.getSelectedRowModel().rows.length}
          variant="destructive"
          onClick={handleBulkDelete}
        >
          Delete Selected
        </Button>
      </div>

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
                          header.getContext(),
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
                  className="cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="max-w-[300px]">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-24 text-center"
                >
                  No variants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
