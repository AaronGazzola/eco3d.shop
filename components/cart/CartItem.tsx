import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CartItem as CartItemType } from "@/types/db.types";
import Image from "next/image";

// export const CartItem = ({ item }: { item: CartItemType }) => {
//   return (
//     <Card className="p-4 flex items-center gap-4">
//       <Avatar>
//         <AvatarImage
//           src={`https://via.placeholder.com/100?text=${item.name}`}
//         />
//         <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
//       </Avatar>

//       <div className="flex-1">
//         <div className="font-semibold">{item.name}</div>
//         <div className="text-sm text-muted-foreground">{`Price: $${item.price}`}</div>
//         <div className="text-sm text-muted-foreground">{`Quantity: ${item.quantity}`}</div>

//         <div className="mt-2 flex gap-2">
//           <Button variant="outline">-</Button>
//           <Button variant="outline">+</Button>
//         </div>
//       </div>

//       <div className="font-bold">{`$${item.price * item.quantity}`}</div>
//     </Card>
//   );
// };

export const CartItem = ({ item }: { item: CartItemType }) => {
  return (
    <Card className="p-2 flex min-h-[120px] gap-[20px] shadow">
      <div className="h-full aspect-square relative">
        <Image fill alt="" src={item.photo} />
      </div>
      <div>
        <div className="text-[20px] font-bold my-[5px]">{item.name}</div>
        <div className="text-[12px] font-normal">
          <b>Price: </b>${item.price} AUD
        </div>
        <div className="text-[11px] font-bold line-clamp-2 mt-[5px] text-gray-600">
          {item.description}
        </div>
      </div>
    </Card>
  );
};
