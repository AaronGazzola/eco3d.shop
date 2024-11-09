"use client";
import Image from "next/image";
import { comfortaa } from "@/styles/fonts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import LogoBackground from "@/components/svg/LogoBackground";
import configuration from "@/configuration";

const Logo = () => {
  return (
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
            comfortaa.className,
          )}
        >
          Eco3D
        </h1>
        <h1
          className={cn(
            "dark:text-gray-100 text-2xl tracking-wider font-black mt-1 ",
            comfortaa.className,
          )}
        >
          Eco3D
        </h1>
      </div>
    </Link>
  );
};

export default Logo;
