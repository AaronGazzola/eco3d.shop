import { MagnifierIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DropDown } from "@/components/layout/DropDown";
import { FilterIcon, UpDownIcon } from "@/components/icons";

export const LandingPageSearchBar = () => {
  return (
    <div className="w-full flex p-[16px] rounded-[84px] gap-[8px] md:gap-[16px] bg-white items-center">
      <div className="flex-1 relative">
        <div className="absolute left-[20px] h-full flex items-center">
          <MagnifierIcon />
        </div>
        <input
          className="h-[64px] border-[1px] border-[#E0E0E0] rounded-[47px] pl-[64px] w-full text-[#757575] text-[20px] font-normal leading-[24px]"
          placeholder="Search products"
        ></input>
        <div className="absolute h-full right-[12px] top-0 flex items-center">
          <Button variant="bgGreen">Search</Button>
        </div>
      </div>
      <div>
        <DropDown
          {...config.sortByDropDown}
          className="rounded-[47px] border border-[#E0E0E0] w-[120px] lg:w-[190px] pl-[30px] lg:pl-[40px] h-[48px]"
        />
      </div>
      <div>
        <DropDown
          {...config.filterByDropDown}
          className="rounded-[47px] border border-[#E0E0E0] w-[100px] lg:w-[190px] pl-[30px] lg:pl-[40px] h-[48px]"
        />
      </div>
    </div>
  );
};

const config = {
  sortByDropDown: {
    icon: <UpDownIcon width={16} height={16} />,
    placeholder: "Sort By",
    options: [
      { value: "None" },
      { value: "Price" },
      { value: "Created At" },
      { value: "Distance" },
    ],
  },
  filterByDropDown: {
    icon: <FilterIcon width={16} height={16} />,
    placeholder: "Filter",
    options: [
      { value: "None" },
      { value: "Date" },
      { value: "Name" },
      { value: "Distance" },
    ],
  },
};
