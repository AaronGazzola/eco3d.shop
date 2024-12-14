import { ColumnDef } from "@tanstack/react-table";

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data?: TData[] | null;
}

export enum AddToCartStep {
  Select = "Select",
  Customise = "Customise",
  Personalise = "Personalise",
  AddToCart = "AddToCart",
}

export enum CartStep {
  Review = "Review",
  Shipping = "Shipping",
  Payment = "Payment",
}
