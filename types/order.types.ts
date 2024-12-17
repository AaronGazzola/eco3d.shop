export enum OrderStatus {
  Waiting = "waiting",
  Printing = "printing",
  Shipped = "shipped",
  Delivered = "delivered",
}

export enum RefundStatus {
  Pending = "pending",
  Processing = "processing",
  Processed = "processed",
}

export interface OrderItem {
  id: number;
  name: string;
  imageUrl: string;
  size: "Small" | "Medium" | "Large";
  colors: string[];
  primaryText?: string[];
  secondaryText?: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  status: OrderStatus | RefundStatus;
  isRefund: boolean;
  startTime?: Date;
  trackingNumber?: string;
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  totalPrice: number;
  expectedFulfillmentDate?: Date;
  currency: string;
  items: OrderItem[];
  createdAt: Date;
}

export const ORDER_STAGES = [
  OrderStatus.Waiting,
  OrderStatus.Printing,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
];

export const REFUND_STAGES = [
  RefundStatus.Pending,
  RefundStatus.Processing,
  RefundStatus.Processed,
];
