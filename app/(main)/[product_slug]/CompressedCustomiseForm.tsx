"use client";

import { useProductStore } from "@/hooks/useProductStore";
import { ImageSize } from "@/types/product.types";
import { useEffect } from "react";

export const CompressedCustomiseForm = () => {
  const { size, colors, setSize, setColors } = useProductStore();

  useEffect(() => {
    if (size === "Small" && colors.includes("White")) {
      setColors(colors.filter((c) => c !== "White"));
    }
  }, [size, colors, setColors]);

  const handleSizeChange = (newSize: ImageSize) => {
    setSize(newSize);
  };

  const handleColorChange = (color: string) => {
    if (color === "Natural" || color === "Black") return;

    const isColorSelected = colors.includes(color);
    if (isColorSelected) {
      setColors(colors.filter((c) => c !== color));
    } else if (!(color === "White" && size === "Small")) {
      setColors([...colors, color]);
    }
  };

  return (
    <div className="flex gap-1.5 xs:gap-2 items-center sm:pr-16 md:pr-4">
      <div className="flex rounded-md overflow-hidden h-8">
        {(["Small", "Medium", "Large"] as ImageSize[]).map((sizeOption) => (
          <button
            key={sizeOption}
            onClick={(e) => {
              e.stopPropagation();
              handleSizeChange(sizeOption);
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
          const isLockedColor = color === "Natural" || color === "Black";
          const isSelected = colors.includes(color) || isLockedColor;

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
                  : isSelected
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
