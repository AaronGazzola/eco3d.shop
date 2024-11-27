"use client";

import Link from "next/link";
import { useState } from "react";
import { PackageSearch, TicketPercent } from "lucide-react";
import { Drawer } from "@/components/layout/Drawer";
import FreeShippingProgress from "@/components/layout/FreeShippingProgress";
import Logo from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import configuration from "@/configuration";
import { useIsAdmin } from "@/hooks/userHooks";
import { cn } from "@/lib/utils";
import { Direction } from "@/types/util.types";

const Header = () => {
  const isAdmin = useIsAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const onToggleDrawerIsOpen = (open?: boolean) =>
    setIsOpen(prev => open ?? !prev);
  return (
    <>
      <header
        className={cn(
          "sticky top-0 left-0 right-0 w-full min-h-12 flex items-stretch shadow-md justify-center bg-background py-0.5 z-50",
        )}
      >
        <div className="flex h-full justify-between max-w-[100rem] flex-grow pr-0.5 items-stretch">
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
