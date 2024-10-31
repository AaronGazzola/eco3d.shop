"use client";
import Logo from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import configuration from "@/configuration";
import { useIsAdmin } from "@/hooks/userHooks";
import { cn } from "@/lib/utils";
import { Moon, PackageSearch, Sun, TicketPercent } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";

const Header = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const isAdmin = useIsAdmin();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };
  return (
    <>
      <header
        className={cn(
          "sticky top-0 left-0 right-0 w-full min-h-12 flex items-stretch shadow-md justify-center bg-background py-0.5"
        )}
      >
        <div className="flex h-full justify-start max-w-[100rem] flex-grow pr-0.5">
          <Logo />
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
          {isAdmin && (
            <div className="h-full items-end flex flex-grow ">
              <Link href={configuration.paths.admin.products}>
                <Button variant="ghost">
                  <PackageSearch />
                </Button>
              </Link>
              <Link href={configuration.paths.admin.promo}>
                <Button variant="ghost">
                  <TicketPercent />
                </Button>
              </Link>
            </div>
          )}
          {/* <FreeShippingProgress onClick={onToggleDrawerIsOpen} />
          <Drawer
            onToggleDrawerIsOpen={onToggleDrawerIsOpen}
            isOpen={isOpen}
            side={Direction.Right}
          />  */}
        </div>
      </header>
    </>
  );
};

export default Header;
