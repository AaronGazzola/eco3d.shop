import { useState } from "react";
import { ArrowDownUp, ListFilter, ChevronDown, SearchIcon } from "lucide-react";
import { Button } from "../ui/button";
import { comfortaa } from "@/styles/fonts";
import { cn } from "@/lib/utils";

export default function SearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="absolute bottom-0 left-[50%] transform -translate-x-2/4 translate-y-2/4 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row items-center bg-white shadow-lg rounded-md md:rounded-full p-4 h-20">
        <div className="w-full max-w-xl">
          <div className="flex items-center border border-[#e0e0e0] w-full p-3 bg-white rounded-[47px] h-14">
            <div className="shrink-0 pr-2 text-gray-500">
              <SearchIcon
                className="h-5 w-5 color-[#757575]"
                aria-hidden="true"
              />
            </div>

            <input
              id="search"
              name="search"
              type="text"
              placeholder="Search products"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={cn("block w-full font-comfortaa font-medium text-xl h-9 leading-5 py-2 pl-3 pr-10 text-[#757575] placeholder:text-gray-400 bg-transparent focus:outline-none focus:ring-2 sm:text-sm", comfortaa.className)}
            />

            <Button className={cn("font-semibold flex items-center justify-center text-base px-4 py-2 text-white  border border-transparent rounded-[57px] h-9", comfortaa.className)}>
              Search
            </Button>
          </div>
        </div>

        <div className="relative flex sm:flex-row gap-3 items-center justify-between m-0 max-w-xl">
          <div className="font-comfortaa font-medium leading-6 flex items-center text-xl sm:text-[14px] text-[#757575] p-4 rounded-full border gap-7 w-max">
            <div className={cn("flex justify-between gap-2", comfortaa.className)}>
              <ArrowDownUp height={24} width={24} className="color-[#757575]" />
              Sort By
            </div>
            <ChevronDown height={24} width={24} className="color-[#757575]" />
          </div>

          <div className="font-comfortaa font-medium leading-6 sm:font-[15px] flex items-center text-xl text-[#757575] sm:text-[14px] p-4 rounded-full border gap-7 w-max">
            <div className={cn("flex justify-between gap-2", comfortaa.className)}>
              <ListFilter height={24} width={24} className="color-[#757575]" />
              Filter
            </div>
            <ChevronDown height={24} width={24} className="color-[#757575]" />
          </div>
        </div>
      </div>
    </div>
  );
}
