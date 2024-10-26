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

// Define Product and Variant types
interface Variant {
  id: string;
  variant_name: string;
  stock_quantity: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
}

// Placeholder product data
const products: Product[] = [
  {
    id: "1",
    name: "Product 1",
    description: "Description for product 1",
    variants: [
      { id: "1-1", variant_name: "Variant 1A", stock_quantity: 100 },
      { id: "1-2", variant_name: "Variant 1B", stock_quantity: 50 },
    ],
  },
  {
    id: "2",
    name: "Product 2",
    description: "Description for product 2",
    variants: [
      { id: "2-1", variant_name: "Variant 2A", stock_quantity: 200 },
      { id: "2-2", variant_name: "Variant 2B", stock_quantity: 75 },
    ],
  },
  {
    id: "3",
    name: "Product 3",
    description: "Description for product 3",
    variants: [{ id: "3-1", variant_name: "Variant 3A", stock_quantity: 150 }],
  },
];

// Define column structure
const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "id",
    header: "Product ID",
  },
  {
    accessorKey: "name",
    header: "Name",
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
          <div key={variant.id}>
            {variant.variant_name} (Stock: {variant.stock_quantity})
          </div>
        ))}
      </div>
    ),
  },
];

const AdminProductsPage = () => {
  const router = useRouter();

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleProductClick = (id: string) => {
    // Placeholder for navigation to a specific product details page
    router.push(`/admin/products/${id}`);
  };

  const { dialog, dismiss } = useDialogQueue();

  return (
    <div className="p-4">
      <button
        onClick={() =>
          dialog(
            <div>
              <h1 className="text-2xl font-bold mb-4">Create Product</h1>
              <input
                type="text"
                placeholder="Name"
                className="border rounded-md p-2 mb-2"
              />
              <input
                type="text"
                placeholder="Description"
                className="border rounded-md p-2 mb-2"
              />
              <button
                onClick={() => dismiss()}
                className="border rounded-md p-2 bg-primary text-white"
              >
                Create
              </button>
            </div>
          )
        }
      >
        test
      </button>
      <h1 className="text-2xl font-bold mb-4">Admin Products</h1>
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
      </div>
    </div>
  );
};

export default AdminProductsPage;
