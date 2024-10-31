"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import PromoDialog from "@/app/admin/promo/PromoDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDialogQueue } from "@/hooks/useDialogQueue";

export type Promo = {
  id: string;
  promo_key: string;
  promo_code: string;
  discountPercent: number;
  expirationDate: string;
  isRedeemed: boolean;
};

export const columns: ColumnDef<Promo>[] = [
  {
    accessorKey: "promo_key",
    header: "Promo Key",
  },
  {
    accessorKey: "promo_code",
    header: "Promo Code",
  },
  {
    accessorKey: "discountPercent",
    header: "Discount (%)",
  },
  {
    accessorKey: "expirationDate",
    header: "Expiration Date",
  },
  {
    accessorKey: "isRedeemed",
    header: "Redeemed",
  },
  {
    accessorKey: "isSeen",
    header: "Seen",
  },
];

interface PromoTableProps {
  columns: ColumnDef<Promo>[];
  data: Promo[];
}

export function PromoTable({ columns, data }: PromoTableProps) {
  const { dialog } = useDialogQueue();
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, i) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="cursor-pointer"
                onClick={() =>
                  dialog(
                    <PromoDialog
                      promoData={{
                        id: row.original.id,
                        promoKey: row.original.promo_key,
                        promoCode: row.original.promo_code,
                        discountPercent: row.original.discountPercent,
                        expirationDate: row.original.expirationDate,
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
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
