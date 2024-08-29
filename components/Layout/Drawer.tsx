"use client";

import { Moon, ShoppingBasket, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import configuration from "@/lib/configuration";
import { comfortaa } from "@/styles/fonts";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Direction } from "@/types/util.types";
import { Badge } from "@/components/ui/badge";
import LogoBackground from "@/components/svg/LogoBackground";

export function Drawer({
  side = Direction.Left,
}: {
  side?: Direction.Left | Direction.Right;
}) {
  const { setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const onSubmit = async () => {};

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => setIsOpen(open)}
    >
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="p-4 h-12 rounded-tr-none px-2 sm:px-4 relative"
        >
          <ShoppingBasket className="w-8 h-8" />
          <Badge className="absolute right-1 bottom-0 px-1.5 py-px bg-green-700 hover:bg-green-700">
            <span className="font-bold text-sm">20</span>
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent
        side={side}
        showCloseButton={false}
        className="!w-full !max-w-md gap-6 flex flex-col border-l border-gray-600 p-0"
      >
        <SheetHeader>
          <div className="w-full flex justify-between items-center p-0.5">
            <Link
              href={configuration.paths.appHome}
              className="flex items-center gap-4 ml-3"
              onClick={() => setIsOpen(false)}
            >
              <div className="relative">
                <div className="hidden dark:block absolute inset-0 -z-10 scale-y-[1.03]">
                  <LogoBackground className="fill-gray-300 stroke-white" />
                </div>
                <Image
                  src="/images/logo.png"
                  alt="Eco3D logo"
                  width={640}
                  height={508}
                  className="w-9 mb-1"
                />
              </div>
              <h1
                className={cn(
                  "dark:text-gray-100 text-2xl tracking-wider font-black",
                  comfortaa.className
                )}
              >
                Eco3D
              </h1>
            </Link>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className={cn(
                  "flex justify-center items-center text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white outline-none p-2"
                )}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 " />
                <span className="sr-only">Toggle theme</span>
              </Button>

              <Button
                value="icon"
                size="sm"
                variant="outline"
                className="border-none dark:text-gray-400 dark:hover:text-white border border-white outline-none text-gray-600 hover:text-black p-4 h-12 rounded-tr-none px-2 sm:px-4"
                onClick={() => setIsOpen(false)}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </div>
          </div>
        </SheetHeader>
        {/* <SheetTitle className="">Your cart</SheetTitle> */}
      </SheetContent>
    </Sheet>
  );
}
