export type PrintStatus = "waiting" | "printing" | "complete";

export interface QueueItemVariant {
  id: string;
  estimated_print_seconds: number | null;
  variant_name: string;
  attributes: Record<string, any> | null;
}

export interface QueueItemOrder {
  id: string;
  created_at: string;
  profile: {
    email: string;
  } | null;
}

export interface QueueItemOrderItem {
  order: QueueItemOrder | null;
}

export interface QueueItemResponse {
  id: string;
  print_queue_id: string;
  created_at: string;
  updated_at: string;
  is_processed: boolean;
  print_started_seconds: number | null;
  quantity: number;
  product_variant: QueueItemVariant | null;
  order_items: QueueItemOrderItem[] | null;
}

export interface QueueItemsActionResponse {
  data: QueueItemResponse[] | null;
  error: Error | null;
}

export interface PrintQueueItemWithStatus extends QueueItemResponse {
  printStatus: PrintStatus;
}
