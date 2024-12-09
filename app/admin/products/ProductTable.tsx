// app/admin/product/columns.tsx

"use client";
import ProductDialog from "@/app/admin/products/ProductDialog";
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
import { ProductWithVariants } from "@/types/db.types";
import { DataTableProps } from "@/types/ui.types";
import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import { EditIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

const EditCell = ({ row }: { row: Row<ProductWithVariants> }) => {
  const { dialog } = useDialogQueue();
  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={e => {
          e.stopPropagation();
          dialog(
            <ProductDialog
              productData={{
                id: row.original.id,
                name: row.original.name,
                description: row.original.description,
                variants: row.original.product_variants || [],
              }}
            />,
          );
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
              name={row.original.name}
              id={row.original.id}
              table="products"
            />,
          );
        }}
      >
        <Trash2 className="w-4" />
      </Button>
    </div>
  );
};

const DateCell = ({ row }: { row: Row<ProductWithVariants> }) => {
  return <div>{dayjs(row.original.created_at).format("H:mm a D-MMM-YY")}</div>;
};

export const productColumns: ColumnDef<ProductWithVariants>[] = [
  {
    id: "edit",
    header: "Actions",
    cell: EditCell,
  },
  {
    accessorKey: "name",
    header: "Product Name",
  },
  {
    accessorKey: "description",
    header: "Product Description",
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: DateCell,
  },
  {
    accessorKey: "updated_at",
    header: "Updated At",
    cell: DateCell,
  },
];

export function ProductTable<TData>({
  columns,
  data,
}: DataTableProps<ProductWithVariants>) {
  const router = useRouter();
  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.id,
  });

  const { dialog } = useDialogQueue();

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
                  router.push(configuration.paths.admin.product(row.id));
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
                No products found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
