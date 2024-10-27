import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CartItem as CartItemType } from "@/types/db.types";
export const CartItem = ({ item }: { item: CartItemType }) => {
  return (
    <Card className="p-4 flex items-center gap-4">
      <Avatar>
        <AvatarImage
          src={`https://via.placeholder.com/100?text=${item.name}`}
        />
        <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="font-semibold">{item.name}</div>
        <div className="text-sm text-muted-foreground">{`Price: $${item.price}`}</div>
        <div className="text-sm text-muted-foreground">{`Quantity: ${item.quantity}`}</div>

        <div className="mt-2 flex gap-2">
          <Button variant="outline">-</Button>
          <Button variant="outline">+</Button>
        </div>
      </div>

      <div className="font-bold">{`$${item.price * item.quantity}`}</div>
    </Card>
  );
};
