"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Printer } from "lucide-react";
import { useState } from "react";

type PrintQueueItem = {
  id: string;
  order_item_id: string;
  quantity: number;
  is_processed: boolean;
  created_at: string;
  order: {
    id: string;
    user: {
      email: string;
    };
    created_at: string;
  };
  related_items: PrintQueueItem[];
};

const mockQueue1: PrintQueueItem[] = [
  {
    id: "1",
    order_item_id: "oi1",
    quantity: 2,
    is_processed: false,
    created_at: "2024-03-18T10:00:00Z",
    order: {
      id: "order1",
      user: { email: "user1@example.com" },
      created_at: "2024-03-18T09:00:00Z",
    },
    related_items: [
      {
        id: "2",
        order_item_id: "oi2",
        quantity: 1,
        is_processed: false,
        created_at: "2024-03-18T10:00:00Z",
        order: {
          id: "order1",
          user: { email: "user1@example.com" },
          created_at: "2024-03-18T09:00:00Z",
        },
        related_items: [],
      },
    ],
  },
];

const mockQueue2: PrintQueueItem[] = [
  {
    id: "3",
    order_item_id: "oi3",
    quantity: 3,
    is_processed: false,
    created_at: "2024-03-18T11:00:00Z",
    order: {
      id: "order2",
      user: { email: "user2@example.com" },
      created_at: "2024-03-18T10:30:00Z",
    },
    related_items: [],
  },
];

const queueData = {
  "1": mockQueue1,
  "2": mockQueue2,
};

const PrintQueueItem = ({ item }: { item: PrintQueueItem }) => {
  const [expanded, setExpanded] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => setIsPrinting(false), 2000);
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-bold">Status</p>
                <p>{item.is_processed ? "Completed" : "Pending"}</p>
              </div>
              <div>
                <p className="font-bold">Time Remaining</p>
                <p>2 hours</p>
              </div>
              <div>
                <p className="font-bold">Order Email</p>
                <p>{item.order.user.email}</p>
              </div>
              <div>
                <p className="font-bold">Order Date</p>
                <p>{new Date(item.order.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-bold">Order Number</p>
                <p>{item.order.id}</p>
              </div>
              <div>
                <p className="font-bold">Quantity</p>
                <p>{item.quantity}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={handlePrint}
              disabled={isPrinting}
            >
              <Printer className={isPrinting ? "animate-pulse" : ""} />
            </Button>
          </div>
        </div>

        {expanded && item.related_items.length > 0 && (
          <div className="mt-4 pl-4 border-l-2">
            <p className="font-bold mb-2">Related Items in Order</p>
            {item.related_items.map((relatedItem) => (
              <PrintQueueItem key={relatedItem.id} item={relatedItem} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const PrintQ = ({ queueId }: { queueId: string }) => {
  const items = queueData[queueId as keyof typeof queueData] || [];

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Print Queue {queueId}</h1>
      {items.map((item) => (
        <PrintQueueItem key={item.id} item={item} />
      ))}
    </div>
  );
};

export default PrintQ;
