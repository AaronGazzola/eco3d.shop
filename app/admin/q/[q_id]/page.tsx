"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";
import { useQueueItems, useUpdatePrintQueueItemStatus } from "@/hooks/qHooks";
import { useToastQueue } from "@/hooks/useToastQueue";
import { formatPrintSeconds } from "@/lib/number.util";
import {
  PrintQueueItemWithStatus,
  PrintStatus,
  QueueItemResponse,
} from "@/types/q.types";
import {
  ColumnDef,
  Row,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Clock, Printer, PrinterCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const getPrintStatus = (item: QueueItemResponse): PrintStatus => {
  if (item.is_processed) return "complete";
  if (!item.product_variant) {
    console.error("Missing product variant data for item:", item.id);
    return "waiting";
  }
  if (item.print_started_seconds === null) return "waiting";

  const now = Math.floor(Date.now() / 1000);
  const startTime = item.print_started_seconds;
  const printSeconds = item.product_variant.estimated_print_seconds || 0;

  if (!printSeconds) return "complete";

  const endTime = startTime + printSeconds;
  if (now < startTime) return "waiting";
  if (now < endTime) return "printing";
  return "complete";
};

const StatusCell = ({
  row,
  queueId,
}: {
  row: Row<PrintQueueItemWithStatus>;
  queueId: string;
}) => {
  const updateStatus = useUpdatePrintQueueItemStatus(row.original.id, queueId);
  const { toast } = useToastQueue();
  const currentStatus = row.original.printStatus;
  const [lastClickTime, setLastClickTime] = useState(0);

  const cycleStatus = async () => {
    try {
      const now = Date.now();
      if (now - lastClickTime < 500) return;
      setLastClickTime(now);

      let nextStatus: PrintStatus;
      switch (currentStatus) {
        case "complete":
          nextStatus = "waiting";
          break;
        case "waiting":
          nextStatus = "printing";
          break;
        case "printing":
          nextStatus = "complete";
          break;
        default:
          nextStatus = "waiting";
      }

      await updateStatus.mutateAsync({
        itemId: row.original.id,
        status: nextStatus,
      });
    } catch (error) {
      toast({
        title: "Failed to update status",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div
      className="flex items-center gap-2 cursor-pointer"
      onClick={cycleStatus}
    >
      <div className="p-2 hover:bg-gray-100 rounded-full">
        {currentStatus === "complete" ? (
          <PrinterCheck className="text-green-500" />
        ) : currentStatus === "printing" ? (
          <Printer className=" text-blue-500" />
        ) : (
          <Clock className="text-gray-500" />
        )}
      </div>
      <span className="capitalize hover:underline">{currentStatus}</span>
    </div>
  );
};

const TimeRemainingCell = ({ row }: { row: Row<PrintQueueItemWithStatus> }) => {
  const printSeconds =
    row.original.product_variant?.estimated_print_seconds || 0;
  const startTimeSeconds = row.original.print_started_seconds;

  if (!startTimeSeconds) {
    return formatPrintSeconds(printSeconds);
  }

  const now = Math.floor(Date.now() / 1000);
  if (now < startTimeSeconds) {
    return formatPrintSeconds(printSeconds);
  }

  const endTime = startTimeSeconds + printSeconds;
  const remainingSeconds = Math.max(0, endTime - now);
  return formatPrintSeconds(remainingSeconds);
};

export default function Page({ params }: { params: { q_id: string } }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: false },
  ]);
  const [showComplete, setShowComplete] = useState(false);
  const [showPrinting, setShowPrinting] = useState(true);
  const [showWaiting, setShowWaiting] = useState(true);
  const [emailFilter, setEmailFilter] = useState("");

  const { data: items = [] } = useQueueItems(params.q_id);

  const itemsWithStatus = useMemo<PrintQueueItemWithStatus[]>(() => {
    if (!items) return [];

    return items.map((item) => ({
      ...item,
      created_at:
        item.created_at || item.updated_at || new Date().toISOString(),
      printStatus: getPrintStatus(item),
    }));
  }, [items]);

  const statusCounts = useMemo(
    () =>
      itemsWithStatus?.reduce(
        (acc, item) => {
          acc[item.printStatus]++;
          return acc;
        },
        { waiting: 0, printing: 0, complete: 0 } as Record<PrintStatus, number>,
      ),
    [itemsWithStatus],
  );

  const filteredItems = useMemo(
    () =>
      itemsWithStatus?.filter((item) => {
        const emailQuery = emailFilter.toLowerCase();
        const emailMatch = item.order_items?.[0]?.order?.profile?.email
          ?.toLowerCase()
          .includes(emailQuery);

        const statusMatch =
          (item.printStatus === "complete" && showComplete) ||
          (item.printStatus === "printing" && showPrinting) ||
          (item.printStatus === "waiting" && showWaiting);
        return (emailQuery && emailMatch) || (!emailQuery && statusMatch);
      }),
    [itemsWithStatus, emailFilter, showComplete, showPrinting, showWaiting],
  );

  const columns: ColumnDef<PrintQueueItemWithStatus>[] = [
    {
      id: "status",
      header: "Status",
      accessorKey: "printStatus",
      cell: ({ row }) => <StatusCell row={row} queueId={params.q_id} />,
    },
    {
      id: "variant",
      header: "Variant",
      accessorFn: (row) => row.product_variant?.variant_name || "N/A",
    },
    {
      id: "quantity",
      header: "Qty",
      accessorKey: "quantity",
    },
    {
      id: "timeRemaining",
      header: "Time Remaining",
      cell: TimeRemainingCell,
    },
    {
      id: "orderId",
      header: "Order ID",
      accessorFn: (row) => row.order_items?.[0]?.order?.id || "",
    },
    {
      id: "email",
      header: "Customer",
      accessorFn: (row) => row.order_items?.[0]?.order?.profile?.email || "",
    },
    {
      id: "started",
      header: "Started",
      accessorKey: "print_started_seconds",
      cell: ({ row }) =>
        row.original.print_started_seconds
          ? new Date(row.original.print_started_seconds * 1000).toLocaleString()
          : "",
    },
    {
      id: "created_at",
      header: "Added",
      accessorKey: "created_at",
      cell: ({ getValue }) => new Date(getValue() as string).toLocaleString(),
    },
  ];

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageSize: 10 } },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSorting([...sorting]);
    }, 1000);
    return () => clearInterval(interval);
  }, [sorting]);

  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-4">
      <h1 className="text-2xl font-bold">Print Queue {params.q_id}</h1>

      <div className="flex gap-4 items-center">
        <div className="flex gap-2 items-center">
          <Toggle pressed={showComplete} onPressedChange={setShowComplete}>
            Complete
          </Toggle>
          <Badge variant="outline">{statusCounts?.complete}</Badge>

          <Toggle pressed={showPrinting} onPressedChange={setShowPrinting}>
            Printing
          </Toggle>
          <Badge variant="outline">{statusCounts?.printing}</Badge>

          <Toggle pressed={showWaiting} onPressedChange={setShowWaiting}>
            Waiting
          </Toggle>
          <Badge variant="outline">{statusCounts?.waiting}</Badge>
        </div>
        <Input
          placeholder="Filter by email..."
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="whitespace-nowrap"
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No print jobs in queue.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
