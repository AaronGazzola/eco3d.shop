// OrderCard.tsx
"use client";
import OrderDetails from "@/app/(main)/me/OrderDetails";
import OrderProgress from "@/app/(main)/me/OrderProgress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Order } from "@/types/order.types";
import { formatDate } from "date-fns";
import { ChevronDown, ChevronUp, Frown, HelpCircle, Phone } from "lucide-react";
import { useState } from "react";

interface OrderCardProps {
  order: Order;
  onRequestRefund: (orderId: string) => void;
  onUpdateStatus: (orderId: string) => void;
}

const OrderCard = ({
  order,
  onRequestRefund,
  onUpdateStatus,
}: OrderCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleRequestRefund = () => {
    onRequestRefund(order.id);
  };

  return (
    <Card className="w-full max-w-3xl p-6 relative">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="text-gray-800 w-96 flex items-stretch gap-4">
          {!order.isRefund && (
            <Button
              onClick={handleRequestRefund}
              className="flex-grow flex gap-4"
              variant="destructive"
            >
              Request Refund <Frown className="w-4 h-4" />
            </Button>
          )}
          <Button variant="outline" className="flex-grow flex gap-4">
            Contact support <Phone className="w-4 h-4" />
          </Button>
        </PopoverContent>
      </Popover>

      <div className="flex flex-col space-y-1">
        <h3 className="text-lg font-semibold">Order #{order.id}</h3>
        <span className="text-sm text-muted-foreground">
          {formatDate(order.createdAt, "dd-MMM-yyyy")}
        </span>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="pt-4">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full flex justify-between">
            Order Details
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <OrderDetails shippingCost={order.shippingCost} items={order.items} />
        </CollapsibleContent>
      </Collapsible>

      <OrderProgress
        status={order.status}
        isRefund={order.isRefund}
        trackingNumber={order.trackingNumber}
      />
    </Card>
  );
};

export default OrderCard;
