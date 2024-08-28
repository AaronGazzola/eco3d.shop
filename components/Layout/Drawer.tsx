"use client";

import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/providers/AuthClientProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import useSupabase from "@/hooks/useSupabase";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { AuthFormType } from "@/types/auth.types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import configuration from "@/lib/configuration";
import { comfortaa } from "@/styles/fonts";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Menu,
  Palette,
  PanelRightClose,
  Settings,
  Settings2,
  SquareChevronRight,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Direction } from "@/types/util.types";
const { SignIn, SignUp, ForgotPassword, ResetPassword } = AuthFormType;
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Drawer({
  side = Direction.Left,
}: {
  side?: Direction.Left | Direction.Right;
}) {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [themeMenuIsOpen, setThemeMenuIsOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const onSubmit = async () => {};

  const onThemeMenuOpenChange = (open: boolean) => {
    setThemeMenuIsOpen(open);
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => setIsOpen(open)}
    >
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="p-4 h-12 rounded-tr-none hover:bg-gray-500/50 px-2 sm:px-4"
        >
          Cart
        </Button>
      </SheetTrigger>
      <SheetContent
        side={side}
        showCloseButton={false}
        className="!w-full !max-w-md gap-6 flex flex-col border-l border-gray-600 p-2"
      >
        <SheetHeader className="m-0 p-0">
          <div className="w-full flex justify-between items-center ">
            <Button
              value="icon"
              size="sm"
              variant="outline"
              className="border-none dark:text-gray-400 dark:hover:text-white border border-white outline-none"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            <Link
              href={configuration.paths.appHome}
              className="flex items-center gap-4 "
              onClick={() => setIsOpen(false)}
            >
              <Image
                src="/images/logo.png"
                alt="Eco3D logo"
                width={640}
                height={508}
                className="w-7 mb-0.5"
              />
              <h1
                className={cn(
                  "dark:text-gray-100 text-2xl tracking-wider font-black",
                  comfortaa.className
                )}
              >
                Eco3D
              </h1>
            </Link>
            <DropdownMenu
              open={themeMenuIsOpen}
              onOpenChange={onThemeMenuOpenChange}
            >
              <DropdownMenuTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "flex justify-center items-center dark:text-gray-400 dark:hover:text-white outline-none",
                    themeMenuIsOpen && "dark:text-white"
                  )}
                >
                  <Sun className="h-6 w-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-6 w-6 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 " />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setTheme("light")}
                >
                  <div className="flex items-center gap-2">
                    Light
                    {theme === "light" && <Check className="w-3" />}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setTheme("dark")}
                >
                  <div className="flex items-center gap-2">
                    Dark
                    {theme === "dark" && <Check className="w-3" />}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setTheme("system")}
                >
                  <div className="flex items-center gap-2">
                    System
                    {theme === "system" && <Check className="w-3" />}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>
        <SheetTitle className="">Your cart</SheetTitle>
      </SheetContent>
    </Sheet>
  );
}
