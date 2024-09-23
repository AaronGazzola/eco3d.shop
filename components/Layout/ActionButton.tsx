import { Button, ButtonProps } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

interface ActionButtonProps extends ButtonProps {
  isPending?: boolean;
}

const ActionButton = ({
  isPending = false,
  children,
  ...props
}: ActionButtonProps) => {
  return (
    <Button
      disabled={isPending}
      {...props}
    >
      <div className="relative flex items-center">
        <div
          className={cn(
            "transition-transform duration-500 ease-out",
            isPending && "-translate-x-4 transform"
          )}
        >
          {children}
        </div>
        <div
          className={cn(
            "absolute right-0 scale-0 transition-all duration-500 ease-out",
            {
              "translate-x-4 scale-100 transform": isPending,
            }
          )}
        >
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
      </div>
    </Button>
  );
};

export default ActionButton;
