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
        {children}

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "scale-0 transition-all duration-500 ease-out",
              isPending && "scale-100"
            )}
          >
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </div>
        </div>
      </div>
    </Button>
  );
};

export default ActionButton;
