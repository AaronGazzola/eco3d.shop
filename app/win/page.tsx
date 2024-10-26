"use client";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import { Box, X } from "lucide-react";
import { useEffect, useState } from "react";

const Page = () => {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const onChange = (val: string) => {
    setValue(val);
    val.length === 6 && setLoading(true);
  };
  useEffect(() => {
    if (loading)
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    if (!loading && value.length === 6) {
      setValue("");
      setShowError(true);
    }
  }, [loading, value]);
  useEffect(() => {
    if (showError)
      setTimeout(() => {
        setShowError(false);
      }, 1500);
  }, [showError]);
  return (
    <InputOTP
      value={value}
      onChange={onChange}
      maxLength={6}
    >
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <div className="relative">
        <div
          className={cn(
            "flex items-center justify-center absolute inset-0 transition-opacity",
            (!loading || showError) && "opacity-0"
          )}
        >
          <Box className={cn("w-5", loading && "animate-pulse")} />
        </div>
        <div
          className={cn(
            "flex items-center justify-center absolute inset-0 transition-opacity",
            (!showError || loading) && "opacity-0"
          )}
        >
          <X className="w-5" />
        </div>
        <InputOTPSeparator
          className={cn(
            "transition-opacity",
            (showError || loading) && "opacity-0"
          )}
        />
      </div>
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
};

export default Page;
