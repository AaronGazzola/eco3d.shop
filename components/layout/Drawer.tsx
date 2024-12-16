"use client";
import Cart from "@/components/cart/Cart";
import AuthFormPopover from "@/components/layout/AuthFormPopover";
import LogoBackground from "@/components/svg/LogoBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import configuration from "@/configuration";
import { useUIStore } from "@/hooks/useUIStore";
import { cn } from "@/lib/utils";
import { comfortaa } from "@/styles/fonts";
import { Direction } from "@/types/util.types";
import { ChevronRight, ShoppingBasket } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function Drawer({
  side = Direction.Left,
}: {
  side?: Direction.Left | Direction.Right;
}) {
  const { isDrawerOpen, toggleDrawer } = useUIStore();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isDrawerOpen]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  if (!mounted) return null;

  return (
    <>
      <Button
        variant="ghost"
        className="p-4 h-12 rounded-tr-none px-2 sm:px-4 relative"
        onClick={() => toggleDrawer(true)}
      >
        <ShoppingBasket className="w-8 h-8 mb-0.5" />
        <Badge className="absolute right-1 bottom-0 px-1.5 py-px bg-green-700 hover:bg-green-700 text-white">
          <span className="font-bold text-sm">0</span>
        </Badge>
      </Button>

      {createPortal(
        <div
          className={cn(
            "fixed inset-0 z-50 transition-all duration-300",
            isDrawerOpen ? "visible" : "invisible",
          )}
        >
          <div
            className={cn(
              "absolute inset-0 bg-black/40 transition-opacity duration-300",
              isDrawerOpen ? "opacity-100" : "opacity-0",
            )}
            onClick={() => toggleDrawer(false)}
          />
          <div
            className={cn(
              "fixed inset-y-0 max-w-md w-full bg-background transition-transform duration-300 ease-in-out flex flex-col gap-6 border-l border-gray-600 p-0",
              side === Direction.Left ? "left-0" : "right-0",
              isDrawerOpen
                ? "translate-x-0"
                : side === Direction.Left
                  ? "-translate-x-full"
                  : "translate-x-full",
            )}
          >
            <div className="w-full flex justify-between items-center p-0.5">
              <Link
                href={configuration.paths.appHome}
                className="flex items-center gap-4 ml-3"
                onClick={() => toggleDrawer(false)}
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
                    comfortaa.className,
                  )}
                >
                  Eco3D
                </h1>
              </Link>
              <div className="flex items-center gap-3">
                <AuthFormPopover />
                <Button
                  value="icon"
                  size="sm"
                  variant="outline"
                  className="border-none dark:text-gray-400 dark:hover:text-white border border-white outline-none text-gray-600 hover:text-black p-4 h-12 rounded-tr-none px-2 sm:px-4"
                  onClick={() => toggleDrawer(false)}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </div>
            </div>
            <Cart />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
