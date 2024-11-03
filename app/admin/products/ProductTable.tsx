// app/admin/product/columns.tsx
"use client";
import ProductDialog from "@/app/admin/products/ProductDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
}

export type Product = {
  id: string;
  name: string;
  description: string | null;
  variants: {
    id: string;
    variantName: string;
    stockQuantity: number;
    estimatedPrintTime: unknown;
  }[];
};

export const productColumns: ColumnDef<Product>[] = [
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
    cell: ({ row }) => (
      <div>
        {row.original.variants.map((variant) => (
          <div
            key={variant.id}
            className="ml-4"
          >
            {variant.variantName} - Stock: {variant.stockQuantity}
          </div>
        ))}
      </div>
    ),
  },
];

export function ProductTable<TData>({
  columns,
  data,
}: DataTableProps<Product>) {
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
                className="cursor-pointer"
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                onClick={() =>
                  dialog(
                    <ProductDialog
                      productData={{
                        id: row.original.id,
                        name: row.original.name,
                        description: row.original.description,
                      }}
                    />
                  )
                }
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
