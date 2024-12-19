// app/payment/success/page.tsx
"use client";

import { handlePaymentSuccess } from "@/actions/paymentActions";
import { useCartStore } from "@/hooks/useCartStore";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, clearCart } = useCartStore();

  useEffect(() => {
    const processPayment = async () => {
      const paymentIntent = searchParams.get("payment_intent");

      if (paymentIntent && items.length) {
        await handlePaymentSuccess(paymentIntent, items);
        clearCart();
        router.push("/");
      }
    };

    processPayment();
  }, [clearCart, items, router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse">Processing your order...</div>
    </div>
  );
}
