"use client";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import AddProductDialog from "@/components/products/AddProductDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const AdminProductsPage = () => {
  const router = useRouter();

  // const table = useReactTable({
  //   data: products,
  //   columns,
  //   getCoreRowModel: getCoreRowModel(),
  // });

  const { dialog, dismiss } = useDialogQueue();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold mb-4">Products</h1>
        <Button
          size="sm"
          className="space-x-2"
          onClick={() => dialog(<AddProductDialog />)}
        >
          <span>Add Product </span>
          <Plus className="w-5" />
        </Button>
      </div>
      {/* <div className="rounded-md border">
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => handleProductClick(row.original.id)}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div> */}
    </div>
  );
};

export default AdminProductsPage;
