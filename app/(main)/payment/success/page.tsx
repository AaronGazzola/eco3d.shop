"use client";
import { handlePaymentSuccess } from "@/actions/paymentActions";
import { useCartStore } from "@/hooks/useCartStore";
import { useSearchParamsContext } from "@/providers/SearchParamsProvider";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

export default function SuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Suspense fallback={null}>
        <PaymentProcessor />
      </Suspense>
    </div>
  );
}

function PaymentProcessor() {
  const router = useRouter();
  const { searchParams } = useSearchParamsContext();
  const { items, clearCart, shippingEmail: email } = useCartStore();

  useEffect(() => {
    const processPayment = async () => {
      const paymentIntent = searchParams?.get("payment_intent");
      if (paymentIntent && items.length) {
        await handlePaymentSuccess(paymentIntent, items, email);
        clearCart();
        router.push("/");
      }
    };
    processPayment();
  }, [clearCart, items, router, searchParams, email]);

  return <div className="animate-pulse">Processing your order...</div>;
}
