import Hero from "@/app/(main)/Hero";
import { ProductListItem } from "@/app/(main)/ProductList";
import { SquareMousePointer } from "lucide-react";

const Page = () => {
  return (
    <>
      <Hero />
      <div className="w-full flex flex-col items-center justify-center gap-14 py-14 pb-14">
        <h2 className="text-4xl font-bold flex items-center gap-4 text-primary">
          <SquareMousePointer className="w-7 h-7" />
          Select
        </h2>
        <ProductListItem />
        <h3 className="text-gray-800">More products coming soon...</h3>
      </div>
    </>
  );
};

export default Page;
