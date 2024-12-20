"use client";
import OrderDetails from "@/components/orders/OrderDetails";
import OrderProgress from "@/components/orders/OrderProgress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUpdateTrackingMutation } from "@/hooks/orderHooks";
import { Order } from "@/types/order.types";
import { formatDate } from "date-fns";
import { ChevronDown, ChevronUp, Frown, HelpCircle, Phone } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const OrderCard = ({ order }: { order: Order }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(
    order.trackingNumber || "",
  );
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const { mutate: updateTracking, isPending } = useUpdateTrackingMutation();

  const handleUpdateTracking = () => {
    if (!trackingNumber.trim()) return;
    updateTracking({ orderId: order.id, trackingNumber });
  };

  const handleRequestRefund = () => {};

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
      <div className="flex flex-col">
        <h3 className="text-lg font-semibold w-[calc(100%-8px)]">
          Order #{order.id}
        </h3>
        <span className="text-sm text-muted-foreground">
          {formatDate(order.createdAt, "dd-MMM-yyyy")}
        </span>
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
            <OrderDetails items={order.items} />
          </CollapsibleContent>
        </Collapsible>
        <OrderProgress
          order={order}
          status={order.status}
          isRefund={order.isRefund}
          trackingNumber={order.trackingNumber}
        />
        {isAdmin && (
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Tracking Number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
            <Button
              onClick={handleUpdateTracking}
              disabled={isPending || !trackingNumber.trim()}
            >
              Save
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default OrderCard;
