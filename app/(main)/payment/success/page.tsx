// app/payment/success/page.tsx
"use client";

import useIsMounted from "@/hooks/useIsMounted";
import { Suspense } from "react";
import { PaymentProcessor } from "./PaymentProcessor";

export default function SuccessPage() {
  const isMounted = useIsMounted();
  if (!isMounted) return null;
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Suspense fallback={<LoadingSpinner />}>
        <PaymentProcessor />
      </Suspense>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
