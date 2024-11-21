import { Product } from "@/types/product.types";
import Image from "next/image";
import { CalendarIcon } from "@/components/icons";

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
      <div className="flex flex-col gap-[8px] mt-[14px] mb-[10px]">
        <div className="text-[20px] font-bold text-gray-900 ">{name}</div>
        <div className="text-[16px] font-medium">${price} AUD</div>
        <div className="text-[12px] font-semibold text-primary-500">
          {0} Items available
        </div>
      </div>
      <div className="flex flex-row w-full h-[30px] bg-[#F5F5F5] rounded-[4px] p-[8px] items-center">
        <CalendarIcon />
        <div className="font-normal text-[12px] text-[#616161] leading-[14.4px] ml-[7px] mr-[4px]">
          Print to order:
        </div>
        <div className="font-normal text-[12px] text-[#37363B] leading-[14.4px]">
          EST. Delivery:{createdAt}
        </div>
      </div>
    </div>
  );
}
