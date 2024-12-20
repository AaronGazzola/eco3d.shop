"use client";

import { useProductStore } from "@/hooks/useProductStore";
import { ImageSize } from "@/types/product.types";

export const CompressedCustomiseForm = () => {
  const { size, colors, setSize, setColors } = useProductStore();

  const handleColorChange = (color: string) => {
    if (color === "Natural" || color === "Black") return;
    setColors(
      colors.includes(color)
        ? colors.filter((c) => c !== color)
        : [...colors, color],
    );
  };

  return (
    <div className="flex gap-1.5 xs:gap-2 items-center sm:pr-16 md:pr-4">
      <div className="flex rounded-md overflow-hidden h-8">
        {["Small", "Medium", "Large"].map((sizeOption) => (
          <button
            key={sizeOption}
            onClick={(e) => {
              e.stopPropagation();
              setSize(sizeOption as ImageSize);
            }}
            className={`px-1.5 xs:px-2 text-sm font-medium transition-colors ${
              size === sizeOption
                ? "bg-secondary text-white"
                : "bg-white border-r last:border-r-0 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className="sm:hidden">{sizeOption[0]}</span>
            <span className="hidden sm:block">{sizeOption}</span>
          </button>
        ))}
      </div>
      <div className="h-6 w-px bg-gray-300" />
      <div className="flex rounded-md overflow-hidden h-8">
        {["Natural", "Black", "White"].map((color) => {
          const isDisabled = color === "White" && size === "Small";
          return (
            <button
              key={color}
              disabled={isDisabled}
              onClick={(e) => {
                e.stopPropagation();
                handleColorChange(color);
              }}
              className={`px-1.5 xs:px-2 text-sm font-medium transition-colors ${
                isDisabled
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : colors.includes(color)
                    ? "bg-secondary text-white"
                    : "bg-white border-r last:border-r-0 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="sm:hidden">{color[0]}</span>
              <span className="hidden sm:block">{color}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CompressedCustomiseForm;
