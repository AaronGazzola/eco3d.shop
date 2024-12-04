import Image from "next/image";
import ProductImage from "@/public/images/products/V8/Aaron-Set-2-22.jpg";
import { Calendar } from "lucide-react";
import { Button } from "../ui/button";

export default function ProductList() {
  return (
    <div className="container mx-auto p-4 mt-[4rem]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(7)].map((_, index) => (
          <div
            key={index}
            className="border rounded-lg shadow-lg overflow-hidden"
          >
            <div className="relative h-56">
              <Image
                src={ProductImage}
                alt={`Product Image ${index + 1}`}
                layout="fill"
                objectFit="cover"
                className="w-full h-full"
              />
            </div>

            <div className="p-4 bg-white">
              <h2 className="font-[700] text-[20px] text-[#37363B]">
                Product Name {index + 1}
              </h2>
              
              <p className="font-[500] text-[16px] text-[#616161] mb-2">
                $49.89 AUD
              </p>
              <Button variant="default" size="sm">
                09 items available
              </Button>
              <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                <Calendar height={15} width={15} />
                <span>Est. Delivery: 25 Nov 2024</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
