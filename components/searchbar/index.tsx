import { useState } from "react";
import Image from "next/image";
import arrow from "../../public/images/search/arrow.png";
// import arrow from "@/public/svg/Up_arrow.svg";
import filter from "@/public/images/search/filter.png";
import searchIcon from "@/public/images/search/search.png";

export default function SearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="absolute bottom-0 left-[50%] transform -translate-x-2/4 translate-y-2/4 w-full max-w-4xl mx-auto p-4">
      <div className="flex flex-col gap-3 sm:flex-row items-center bg-white shadow-lg rounded-md md:rounded-full p-4">
        <div className="flex flex-1 gap-1">
          <div className="flex flex-1 border">
            <Image
              src={searchIcon}
              alt="search Icon"
              className="rounded-full"
            />
            <input
              type="text"
              placeholder="Search products"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full px-4 py-2 text-sm text-gray-700 focus:outline-none rounded-full"
            />
          </div>

          {/* hover:bg-green-700 */}
          <button className="bg-customgreen-primary text-customwhite-primary px-4 py-2 rounded-full text-sm transition">
            Search
          </button>
        </div>

        <div className="relative flex gap-3 items-center justify-between m-0">
          <button className="flex items-center text-sm text-gray-700 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition border">
            <Image
              src={arrow}
              alt="Up Arrow- Down Arrow"
              height={20}
              width={20}
              className="object-cover"
            />
            Sort By
            <svg
              className="w-4 h-4 ml-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 9.293a1 1 0 011.414 0L10 12.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button className="flex items-center text-sm text-gray-700 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition border">
            <Image
              src={filter}
              alt="Filter Line"
              height={20}
              width={20}
              className="object-cover"
            />
            Filter
            <svg
              className="w-4 h-4 ml-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 9.293a1 1 0 011.414 0L10 12.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
