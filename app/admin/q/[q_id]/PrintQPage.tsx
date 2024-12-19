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
import { useUpdatePrintQueueItemStatus } from "@/hooks/qHooks";
import { useToastQueue } from "@/hooks/useToastQueue";
import { formatPrintSeconds } from "@/lib/number.util";
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

type PrintStatus = "waiting" | "printing" | "complete";

type PrintQItem = {
  id: string;
  order_item_id: string | null;
  quantity: number;
  is_processed: boolean | null;
  print_started_seconds: number | null;
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
  printStatus?: PrintStatus;
};

const getPrintStatus = (item: PrintQItem): PrintStatus => {
  // First check if it's marked as processed in the database
  if (item.is_processed) return "complete";

  // Validate required data
  if (!item.product_variant) {
    console.error("Missing product variant data for item:", item.id);
    return "waiting";
  }

  // If no start time, it's waiting
  if (item.print_started_seconds === null) return "waiting";

  const now = Math.floor(Date.now() / 1000);
  const startTime = item.print_started_seconds;
  const printSeconds = item.product_variant.estimated_print_seconds || 0;

  // If no print time is set, treat as instant
  if (!printSeconds) {
    return "complete";
  }

  const endTime = startTime + printSeconds;

  // If we haven't reached the start time yet, it's waiting
  if (now < startTime) return "waiting";

  // If we're between start and end time, it's printing
  if (now < endTime) return "printing";

  // If we're past the end time, it's complete
  return "complete";
};

const StatusCell = ({ row }: { row: Row<PrintQItem> }) => {
  const updateStatus = useUpdatePrintQueueItemStatus(row.original.id);

  const { toast } = useToastQueue();
  const currentStatus = row.original.printStatus || "waiting";
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
          <Printer className="animate-pulse text-blue-500" />
        ) : (
          <Clock className="text-gray-500" />
        )}
      </div>
      <span className="capitalize hover:underline">{currentStatus}</span>
    </div>
  );
};

const TimeRemainingCell = ({ row }: { row: Row<PrintQItem> }) => {
  const printSeconds =
    row.original.product_variant?.estimated_print_seconds || 0;
  const startTimeSeconds = row.original.print_started_seconds;

  // If no start time, show total print time
  if (!startTimeSeconds) {
    return formatPrintSeconds(printSeconds);
  }

  const now = Math.floor(Date.now() / 1000);

  // If start time is in the future, show total print time
  if (now < startTimeSeconds) {
    return formatPrintSeconds(printSeconds);
  }

  // Calculate remaining time
  const endTime = startTimeSeconds + printSeconds;
  const remainingSeconds = Math.max(0, endTime - now);

  return formatPrintSeconds(remainingSeconds);
};

export default function PrintQPage({
  items,
  queueId,
}: {
  items: PrintQItem[];
  queueId: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "print_started_seconds", desc: true },
  ]);
  const [showComplete, setShowComplete] = useState(false);
  const [showPrinting, setShowPrinting] = useState(true);
  const [showWaiting, setShowWaiting] = useState(true);
  const [emailFilter, setEmailFilter] = useState("");

  const itemsWithStatus = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        printStatus: getPrintStatus(item),
      })),
    [items],
  );

  const statusCounts = useMemo(() => {
    return itemsWithStatus.reduce(
      (acc, item) => {
        acc[item.printStatus]++;
        return acc;
      },
      { waiting: 0, printing: 0, complete: 0 },
    );
  }, [itemsWithStatus]);

  const filteredItems = useMemo(() => {
    return itemsWithStatus.filter((item) => {
      const emailMatch = item.order_items?.order?.profile?.email
        ?.toLowerCase()
        .includes(emailFilter.toLowerCase());
      const statusMatch =
        (item.printStatus === "complete" && showComplete) ||
        (item.printStatus === "printing" && showPrinting) ||
        (item.printStatus === "waiting" && showWaiting);
      return emailMatch && statusMatch;
    });
  }, [itemsWithStatus, emailFilter, showComplete, showPrinting, showWaiting]);

  const qColumns: ColumnDef<PrintQItem>[] = [
    {
      id: "status",
      header: "Status",
      cell: StatusCell,
      size: 150,
    },
    {
      accessorKey: "product_variant.variant_name",
      header: "Variant",
      size: 200,
      cell: ({ row }) => row.original.product_variant?.variant_name || "N/A",
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
    {
      accessorKey: "print_started_seconds",
      header: "Started",
      cell: ({ row }) =>
        row.original.print_started_seconds
          ? new Date(row.original.print_started_seconds * 1000).toLocaleString()
          : "",
    },
  ];

  const table = useReactTable({
    data: filteredItems,
    columns: qColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      // Force a re-render to update time calculations
      setSorting([...sorting]);
    }, 1000);

    return () => clearInterval(interval);
  }, [sorting]);

  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-4">
      <h1 className="text-2xl font-bold">Print Queue {queueId}</h1>

      <div className="flex gap-4 items-center">
        <div className="flex gap-2 items-center">
          <Toggle pressed={showComplete} onPressedChange={setShowComplete}>
            Complete
          </Toggle>
          <Badge variant="outline">{statusCounts.complete}</Badge>

          <Toggle pressed={showPrinting} onPressedChange={setShowPrinting}>
            Printing
          </Toggle>
          <Badge variant="outline">{statusCounts.printing}</Badge>

          <Toggle pressed={showWaiting} onPressedChange={setShowWaiting}>
            Waiting
          </Toggle>
          <Badge variant="outline">{statusCounts.waiting}</Badge>
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
    </div>
  );
}
