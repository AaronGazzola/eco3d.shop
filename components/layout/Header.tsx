"use client";
import { cn } from "@/lib/utils";
import { Drawer } from "@/components/layout/Drawer";
import { Direction } from "@/types/util.types";
import FreeShippingProgress from "@/components/layout/FreeShippingProgress";
import { useState } from "react";
import Logo from "@/components/layout/Logo";
import { useIsAdmin } from "@/hooks/userHooks";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import configuration from "@/configuration";
import { PackageSearch } from "lucide-react";

const Header = () => {
  const isAdmin = useIsAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const onToggleDrawerIsOpen = (open?: boolean) =>
    setIsOpen((prev) => open ?? !prev);
  return (
    <>
      <header
        className={cn(
          "sticky top-0 left-0 right-0 w-full min-h-12 flex items-stretch shadow-md justify-center bg-background py-0.5"
        )}
      >
        <div className="flex h-full justify-between max-w-[100rem] flex-grow pr-0.5">
          <Logo />
          {isAdmin && (
            <div className="h-full items-end flex flex-grow ">
              <Link href={configuration.paths.admin.products}>
                <Button variant="ghost">
                  <PackageSearch />
                </Button>
              </Link>
            </div>
          )}
          <FreeShippingProgress onClick={onToggleDrawerIsOpen} />
          <Drawer
            onToggleDrawerIsOpen={onToggleDrawerIsOpen}
            isOpen={isOpen}
            side={Direction.Right}
          />
        </div>
      </header>
    </>
  );
};

export default Header;
