"use client";
import Image from "next/image";
import { comfortaa } from "@/styles/fonts";
import { cn } from "@/lib/utils";
import configuration from "@/lib/configuration";
import Link from "next/link";
import { Drawer } from "@/components/Drawer";
import { Direction } from "@/types/util.types";
import { Gem } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <>
      <header
        className={cn(
          "sticky top-0 left-0 right-0 w-full min-h-12 flex items-stretch shadow-md justify-center bg-background py-0.5"
        )}
      >
        <div className="flex h-full justify-between max-w-[100rem] flex-grow">
          <Link
            href={configuration.paths.appHome}
            className="flex items-center gap-2 sm:gap-4 px-4"
          >
            <Image
              src="/images/logo.png"
              alt="Eco3d.shop logo"
              width={640}
              height={508}
              className="w-7"
            />
            <div className="relative">
              <h1
                className={cn(
                  "absolute inset-0 translate-x-1 translate-y-1 text-gray-200 dark:text-gray-800 text-2xl tracking-wider font-black mt-1 -z-10",
                  comfortaa.className
                )}
              >
                Eco3D.shop
              </h1>
              <h1
                className={cn(
                  "dark:text-gray-100 text-2xl tracking-wider font-black mt-1 ",
                  comfortaa.className
                )}
              >
                Eco3D.shop
              </h1>
            </div>
          </Link>
          <div className="flex items-center gap-3 flex-grow justify-end relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="flex items-center gap-3 flex-grow justify-end sm:pr-4">
                <Button
                  variant="ghost"
                  className="w-full flex items-center gap-1.5 sm:gap-3 flex-grow justify-start h-12 pl-2 sm:px-4 max-w-[260px] sm:max-w-[300px]"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-green-500">
                      LEVEL
                    </span>
                    <span className="text-lg m-0 p-0 leading-none font-bold text-green-500">
                      2
                    </span>
                  </div>
                  <div className="flex-grow  h-full relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-lg border border-gray-500  flex items-center p-0.5 w-full">
                        <div className="w-2/3 h-0.5 rounded bg-green-500"></div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "w-7 h-10 rounded-full flex flex-col items-center justify-center py-1 group-hover:dark:text-white dark:text-green-500 "
                    )}
                  >
                    <Gem className="" />
                  </div>
                </Button>
              </div>
            </div>
          </div>
          <Drawer side={Direction.Right} />
        </div>
      </header>
    </>
  );
};

export default Header;
