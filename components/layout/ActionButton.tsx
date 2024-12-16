"use client";

import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";
import { forwardRef } from "react";

interface ActionButtonProps extends ButtonProps {
  loading?: boolean;
}

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ loading = false, children, ...props }, ref) => {
    return (
      <Button ref={ref} disabled={loading} {...props}>
        <div className="relative flex items-center">
          {children}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                "scale-0 transition-all duration-500 ease-out",
                loading && "scale-100",
              )}
            >
              <LoaderCircle className="h-6 w-6 animate-spin" />
            </div>
          </div>
        </div>
      </Button>
    );
  },
);

ActionButton.displayName = "ActionButton";

export default ActionButton;
