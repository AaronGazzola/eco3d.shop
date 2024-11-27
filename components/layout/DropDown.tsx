"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DropDownProps = {
  icon: React.ReactNode;
  placeholder: string;
  options: { value: string }[];
  className?: string;
};

export const DropDown = ({
  icon,
  placeholder,
  options,
  className,
}: DropDownProps) => {
  return (
    <Select>
      <SelectTrigger
        className={cn(
          "relative text-gray-500 font-normal text-[16px] leading-[18px] h-5",
          className,
        )}
      >
        <div className="absolute left-[10px] lg:left-[20px] h-full flex items-center">
          {icon}
        </div>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options?.map(option => {
          return (
            <SelectItem value={option.value} key={option.value}>
              {option.value}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
