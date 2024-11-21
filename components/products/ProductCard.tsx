import { Product } from "@/types/product.types";
import Image from "next/image";

interface ProductCardProps extends Product {}

export default function ProductCard({
  id,
  photo,
  name,
  price,
  createdAt,
  deliveryStartDate,
  deliveryEndDate,
}: ProductCardProps) {
  return (
    <div className="p-[12px] rounded-[12px] border-[1px] border-gray-300">
      <div className="w-full aspect-square relative">
        <Image src={photo} fill alt={name} className="object-cover" />
      </div>
      <div className="text-[20px] font-bold text-gray-900">{name}</div>
    </div>
  );
}
