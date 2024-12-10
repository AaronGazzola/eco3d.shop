import { cn } from "@/lib/utils";
import ProductImage from "@/public/images/products/V8/Aaron-Set-2-22.jpg";
import { Calendar } from "lucide-react";
import Image from "next/image";

export default function ProductList() {
  return (
    <div className="container mx-auto p-4 mt-28 xs:mt-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(7)].map((_, index) => (
          <div
            className="p-3 rounded-xl border shadow-lg border-[#E0E0E0] bg-white"
            key={index}
          >
            <div className="overflow-hidden flex flex-col gap-4">
              <div className="relative h-60">
                <Image
                  src={ProductImage}
                  alt={`Product Image ${index + 1}`}
                  layout="fill"
                  objectFit="cover"
                  className="w-full h-full rounded-[6px]"
                />
              </div>

              <div className="bg-white">
                <h2 className={cn("font-bold text-xl text-[#37363B]")}>
                  Product Name {index + 1}
                </h2>

                <p className={cn("font-medium text-base text-[#616161] mt-2")}>
                  $49.89 AUD
                </p>

                <div
                  className={cn(
                    "font-medium mt-4 text-sm text-[#37363B] flex items-center gap-2",
                  )}
                >
                  <Calendar height={24} width={24} />
                  <span>Est. Delivery: 25 Nov 2024</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
