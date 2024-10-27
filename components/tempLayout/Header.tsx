"use client";
import Image from "next/image";
import { comfortaa } from "@/styles/fonts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Drawer } from "@/components/layout/Drawer";
import { Direction } from "@/types/util.types";
import LogoBackground from "@/components/svg/LogoBackground";
import FreeShippingProgress from "@/components/layout/FreeShippingProgress";
import configuration from "@/configuration";

const Header = () => {
  return (
    <>
      <header
        className={cn(
          "sticky top-0 left-0 right-0 w-full min-h-12 flex items-stretch shadow-md justify-center bg-background py-0.5"
        )}
      >
        <div className="flex h-full justify-between max-w-[100rem] flex-grow pr-0.5">
          <Link
            href={configuration.paths.appHome}
            className="flex items-center gap-2 sm:gap-4 px-4"
          >
            <div className="relative">
              <div className="hidden dark:block absolute inset-0 -z-10 scale-y-[1.03]">
                <LogoBackground className="fill-gray-300 stroke-white" />
              </div>
              <Image
                src="/images/logo.png"
                alt="Eco3d logo"
                width={640}
                height={508}
                className="w-14 z-20"
              />
            </div>
            <div className="relative">
              <h1
                className={cn(
                  "absolute inset-0 translate-x-1 translate-y-1 text-gray-200 dark:text-gray-800 text-2xl tracking-wider font-black mt-1 -z-10",
                  comfortaa.className
                )}
              >
                Eco3D
              </h1>
              <h1
                className={cn(
                  "dark:text-gray-100 text-2xl tracking-wider font-black mt-1 ",
                  comfortaa.className
                )}
              >
                Eco3D
              </h1>
            </div>
          </Link>
          <FreeShippingProgress />
          <Drawer side={Direction.Right} />
        </div>
      </header>
    </>
  );
};

export default Header;
