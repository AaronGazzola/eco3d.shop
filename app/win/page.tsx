"use client";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useGetPromoCodeByItemCode } from "@/hooks/promoHooks";
import { cn } from "@/lib/utils";
import { Box, X } from "lucide-react";
import { useState } from "react";

const Page = () => {
  const [value, setValue] = useState("");
  const {
    data: promoCode,
    mutate: verifyCode,
    isPending,
    isError,
  } = useGetPromoCodeByItemCode();

  const onChange = (val: string) => {
    setValue(val);
    if (val.length < 6) return;
    verifyCode(val);
  };
  if (promoCode) return <div>{promoCode.promo_code}</div>;

  return (
    <div className=" w-full h-full min-h-screen flex items-center pt-10 flex-col gap-10">
      <h1 className="text-2xl font-bold tracking-tight lg:text-4xl text-gray-800 dark:text-gray-300">
        Enter your code to win!
      </h1>
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
              (!isPending || isError) && "opacity-0"
            )}
          >
            <Box className={cn("w-5", isPending && "animate-pulse")} />
          </div>
          <div
            className={cn(
              "flex items-center justify-center absolute inset-0 transition-opacity",
              (!isError || isPending) && "opacity-0"
            )}
          >
            <X className="w-5" />
          </div>
          <InputOTPSeparator
            className={cn(
              "transition-opacity",
              (isError || isPending) && "opacity-0"
            )}
          />
        </div>
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
};

export default Page;
