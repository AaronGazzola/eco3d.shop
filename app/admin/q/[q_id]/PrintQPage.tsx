"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrintSeconds } from "@/lib/number.util";
import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CheckCircle, PlayCircle, Printer } from "lucide-react";

type PrintQItem = {
  id: string;
  order_item_id: string | null;
  quantity: number;
  is_processed: boolean | null;
  created_at: string | null;
  order_items: {
    order: {
      id: string;
      profile: {
        email: string;
      };
    } | null;
  } | null;
  product_variant: {
    estimated_print_seconds: number | null;
    variant_name: string;
  } | null;
};

const StatusCell = ({ row }: { row: Row<PrintQItem> }) => {
  const isPrinting = false; // TODO: Add printing state
  const isComplete = row.original.is_processed;

  if (isComplete) return <CheckCircle className="text-green-500" />;
  if (isPrinting) return <Printer className="animate-pulse text-blue-500" />;
  return <PlayCircle className="text-gray-500" />;
};

const TimeRemainingCell = ({ row }: { row: Row<PrintQItem> }) => {
  const printSeconds =
    row.original.product_variant?.estimated_print_seconds || 0;
  const startTime =
    (row.original.created_at && new Date(row.original.created_at).getTime()) ||
    0;
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const remainingSeconds = Math.max(0, printSeconds - elapsedSeconds);

  return formatPrintSeconds(remainingSeconds);
};

const qColumns: ColumnDef<PrintQItem>[] = [
  {
    id: "status",
    header: "Status",
    cell: StatusCell,
    size: 50,
  },
  {
    accessorKey: "product_variant.variant_name",
    header: "Variant",
    size: 200,
  },
  {
    accessorKey: "quantity",
    header: "Qty",
    size: 50,
  },
  {
    id: "timeRemaining",
    header: "Time Remaining",
    cell: TimeRemainingCell,
    size: 100,
  },
  {
    accessorKey: "order_items.order.id",
    header: "Order ID",
    size: 200,
  },
  {
    accessorKey: "order_items.order.profile.email",
    header: "Customer",
    size: 200,
  },
];

export default function PrintQPage({
  items,
  queueId,
}: {
  items: PrintQItem[];
  queueId: string;
}) {
  const table = useReactTable({
    data: items,
    columns: qColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-4">
      <h1 className="text-2xl font-bold">Print Queue {queueId}</h1>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                  >
                    {flexRender(
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
                  colSpan={qColumns.length}
                  className="h-24 text-center"
                >
                  No print jobs in queue.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* <DataTablePagination table={table} /> */}
    </div>
  );
}
