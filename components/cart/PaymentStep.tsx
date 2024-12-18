"use client";
import { createPaymentIntent } from "@/actions/paymentActions";
import { Button } from "@/components/ui/button";
import configuration from "@/configuration";
import { useCartStore } from "@/hooks/useCartStore";
import { calculateSubtotal, calculateTotal } from "@/lib/cart.util";
import { cn } from "@/lib/utils";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface PaymentStepProps {
  amount: number;
  isTransitioning: boolean;
  isActive: boolean;
}

const StripeComponent = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const { items } = useCartStore();
  const subtotal = calculateSubtotal(items);
  const total = calculateTotal(subtotal);

  const handleChange = (event: any) => {
    setIsFormValid(event.complete);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    try {
      setLoading(true);
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url:
            configuration.site.siteUrl + configuration.paths.me.success,
        },
      });

      if (result.error) {
        setError(result.error.message ?? "Payment failed");
      }
    } catch (err) {
      setError("An error occurred during payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <div className="rounded-md border p-4">
          <PaymentElement onChange={handleChange} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        className="w-full text-base"
        disabled={!stripe || !elements || loading || !isFormValid}
      >
        {loading ? "Processing..." : `Pay $${total.toFixed(2)} AUD`}
      </Button>
    </form>
  );
};

const PaymentStep = ({
  amount,
  isActive,
  isTransitioning,
}: PaymentStepProps) => {
  const [clientSecret, setClientSecret] = useState<string>();

  useEffect(() => {
    const initializePayment = async () => {
      try {
        const total = calculateTotal(amount);
        const { clientSecret } = await createPaymentIntent(total);
        if (clientSecret) {
          setClientSecret(clientSecret);
        }
      } catch (error) {
        console.error("Failed to initialize payment:", error);
      }
    };
    if (isActive) initializePayment();
  }, [amount, isActive]);

  if (!clientSecret) return null;

  return (
    <div
      className={cn(
        "space-y-4 py-2 pb-4 px-4 overflow-y-auto absolute inset-0",
        isTransitioning && "overflow-y-hidden",
      )}
    >
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: { theme: "stripe" },
        }}
      >
        <StripeComponent />
      </Elements>
    </div>
  );
};

export default PaymentStep;
