// app/payment/success/PaymentProcessor.tsx
"use client";

import { handlePaymentSuccess } from "@/actions/paymentActions";
import { useCartStore } from "@/hooks/useCartStore";
import { useSignInWithMagicLink } from "@/hooks/userHooks";
import { useSearchParamsContext } from "@/providers/SearchParamsProvider";
import { FileBox, Move3D } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function PaymentProcessor() {
  const router = useRouter();
  const { searchParams } = useSearchParamsContext();
  const { items, clearCart, shippingEmail: email } = useCartStore();
  const { mutate: signIn } = useSignInWithMagicLink();
  const [isProcessed, setIsProcessed] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [redirectNow, setRedirectNow] = useState(false);

  // Memoize the payment processing function
  const processPayment = useCallback(async () => {
    try {
      const paymentIntent = searchParams?.get("payment_intent");

      // If no payment intent or items, redirect quickly
      if (!paymentIntent || !items.length) {
        setCountdown(3);
        return;
      }

      await handlePaymentSuccess(paymentIntent, items, email);
      clearCart();
      signIn(email);
      setIsProcessed(true);
    } catch (error) {
      console.error("Payment processing error:", error);
      router.push("/cart?error=payment_processing");
    }
  }, [searchParams, items, email, clearCart, signIn, router]);

  // Handle initial payment processing
  useEffect(() => {
    if (!isProcessed) {
      processPayment();
    }
  }, [processPayment, isProcessed]);

  // Handle countdown and redirect after successful processing
  useEffect(() => {
    if (!isProcessed && countdown > 3) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setRedirectNow(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isProcessed, router, countdown]);

  useEffect(() => {
    if (redirectNow) {
      router.push("/");
    }
  }, [redirectNow, router]);

  if (isProcessed) {
    return (
      <div className="flex flex-col items-center gap-4">
        <FileBox className="w-16 h-16 text-primary" />
        <h1 className="text-2xl font-bold">
          Order confirmed! Please check your email.
        </h1>
        <p className="text-muted-foreground">
          Redirecting home in {countdown} seconds...
        </p>
      </div>
    );
  }

  if (countdown <= 3) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Move3D className="w-16 h-16 text-primary animate-blub" />
        <p className="text-muted-foreground">
          Redirecting home in {countdown} seconds...
        </p>
      </div>
    );
  }

  return <Move3D className="w-16 h-16 text-primary animate-blub" />;
}
