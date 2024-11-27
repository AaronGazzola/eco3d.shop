"use client";
import { Drawer } from "@/components/layout/Drawer";
import FreeShippingProgress from "@/components/layout/FreeShippingProgress";
import Logo from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import configuration from "@/configuration";
import { useIsAdmin } from "@/hooks/userHooks";
import { cn } from "@/lib/utils";
import { Direction } from "@/types/util.types";
import { PackageSearch, TicketPercent } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const Header = () => {
  const isAdmin = useIsAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const onToggleDrawerIsOpen = (open?: boolean) =>
    setIsOpen(prev => open ?? !prev);
  return (
    <>
      <header
        className={cn(
          "sticky top-0 left-0 right-0 w-full min-h-12 flex items-stretch shadow-md justify-center bg-background py-0.5",
        )}
      >
        <div className="flex h-full justify-between flex-grow pr-0.5 items-stretch max-w-4xl">
          <Logo />
          {isAdmin && (
            <div className="items-center flex flex-grow">
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
