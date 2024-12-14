"use client";

import useIsMounted from "@/hooks/useIsMounted";
import { ImageSize } from "@/types/product.types";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";

export const CompressedCustomiseForm = () => {
  const isMounted = useIsMounted();
  const [isInit, setIsInit] = useState(false);

  const [sizeParam, setSizeParam] = useQueryState("size", {
    defaultValue: "Small",
    parse: (value: string | null): ImageSize =>
      ["Small", "Medium", "Large"].includes(value || "")
        ? (value as ImageSize)
        : "Small",
  });

  const [colorsParam, setColorsParam] = useQueryState("colors", {
    defaultValue: '["Natural","Black"]',
    parse: (value: string | null) => {
      try {
        const parsed = JSON.parse(value || '["Natural","Black"]');
        return Array.isArray(parsed)
          ? JSON.stringify(parsed)
          : '["Natural","Black"]';
      } catch {
        return '["Natural","Black"]';
      }
    },
  });

  const size = sizeParam as ImageSize;
  const colors = JSON.parse(colorsParam);

  useEffect(() => {
    if (isMounted && !isInit) {
      setIsInit(true);
      setSizeParam(sizeParam || "Small");
      setColorsParam(colorsParam || '["Natural","Black"]');
    }
  }, [isMounted, setSizeParam, setColorsParam, sizeParam, colorsParam, isInit]);

  useEffect(() => {
    if (size === "Small" && Array.isArray(colors) && colors.includes("White")) {
      setColorsParam(JSON.stringify(colors.filter(c => c !== "White")));
    }
  }, [size, colors, setColorsParam]);

  return (
    <div className="flex gap-1.5 xs:gap-2 items-center sm:pr-16 md:pr-4">
      <div className="flex rounded-md overflow-hidden h-8">
        {["Small", "Medium", "Large"].map(sizeOption => (
          <button
            key={sizeOption}
            onClick={e => {
              e.stopPropagation();
              setSizeParam(sizeOption as ImageSize);
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
        {["Natural", "Black", "White"].map(color => {
          const isDisabled = color === "White" && size === "Small";
          return (
            <button
              key={color}
              disabled={isDisabled}
              onClick={e => {
                e.stopPropagation();
                if (color === "Natural" || color === "Black") return;
                setColorsParam(
                  JSON.stringify(
                    colors.includes(color)
                      ? colors.filter((c: string) => c !== color)
                      : [...colors, color],
                  ),
                );
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
