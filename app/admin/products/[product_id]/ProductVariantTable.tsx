// app/admin/products/[product_id]/ProductVariantTable.tsx
"use client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmDeleteDialog from "@/components/ux/ConfirmDeleteDialog";
import configuration from "@/configuration";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import { ProductVariant } from "@/types/db.types";
import { DataTableProps } from "@/types/ui.types";
import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { EditIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { CreateVariantDialog } from "./CreateVariantDialog";

const EditCell = ({ row }: { row: Row<ProductVariant> }) => {
  const { dialog } = useDialogQueue();
  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={e => {
          e.stopPropagation();
          dialog(<CreateVariantDialog productVariant={row.original} />);
        }}
      >
        <EditIcon className="w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={e => {
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

const AttributesCell = ({ row }: { row: Row<ProductVariant> }) => {
  return (
    <pre className="text-xs">
      {JSON.stringify(row.original.attributes, null, 2)}
    </pre>
  );
};

export const variantColumns: ColumnDef<ProductVariant>[] = [
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
    header: "Print Time (s)",
  },
];

export function ProductVariantTable<TData>({
  columns,
  data,
}: DataTableProps<ProductVariant>) {
  const router = useRouter();
  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.id,
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
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
            table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="cursor-pointer"
                onClick={() => {
                  router.push(
                    configuration.paths.admin.product(
                      row.original.product_id!,
                    ) +
                      "/" +
                      row.id,
                  );
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="max-w-[300px]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No variants found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
