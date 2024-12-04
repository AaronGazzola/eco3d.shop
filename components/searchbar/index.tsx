import { useState } from "react";
import { Search, ArrowDownUp, ListFilter, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";


export default function SearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="absolute bottom-0 left-[50%] transform -translate-x-2/4 translate-y-2/4 w-full max-w-4xl mx-auto p-4">
      <div className="flex flex-col gap-3 sm:flex-row items-center bg-white shadow-lg rounded-md md:rounded-full p-4">
        <div className="flex flex-1 gap-1">
          <div className="flex flex-1 align-center justify-center border">
            <Search className="rounded-full flex justify-center" />
            <input
              type="text"
              placeholder="Search products"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full px-4 py-2 text-sm text-gray-700 focus:outline-none rounded-full"
            />
          </div>
          <Button variant="default" size={"sm"} className="text-white rounded-full">Search</Button>
        </div>

        <div className="relative flex gap-3 items-center justify-between m-0">
          <div className="flex items-center text-sm text-gray-700 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition border gap-2">
            <ArrowDownUp height={15} width={15} />
            Sort By
            <ChevronDown height={15} width={15}/>
          </div>
          <div className="flex items-center text-sm text-gray-700 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition border gap-2">
            <ListFilter height={15} width={15} />
            Filter
            <ChevronDown height={15} width={15}/>
          </div>
        </div>
      </div>
    </div>
  );
}
