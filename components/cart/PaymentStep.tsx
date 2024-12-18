"use client";
import { createPaymentIntent } from "@/actions/paymentActions";
import { Button } from "@/components/ui/button";
import configuration from "@/configuration";
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

interface StripeComponentProps {
  clientSecret: string;
  amount: number;
}

interface PaymentStepProps {
  amount: number;
  isTransitioning: boolean;
}

const StripeComponent = ({ clientSecret, amount }: StripeComponentProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          <PaymentElement />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        className="w-full text-base"
        disabled={!stripe || !elements || loading}
      >
        {loading ? "Processing..." : `Pay $${amount.toFixed(2)}`}
      </Button>
    </form>
  );
};

const PaymentStep = ({ amount, isTransitioning }: PaymentStepProps) => {
  const [clientSecret, setClientSecret] = useState<string>();

  useEffect(() => {
    const initializePayment = async () => {
      try {
        const { clientSecret } = await createPaymentIntent(amount);
        if (clientSecret) {
          setClientSecret(clientSecret);
        }
      } catch (error) {
        console.error("Failed to initialize payment:", error);
      }
    };
    initializePayment();
  }, [amount]);

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
        <StripeComponent amount={amount} clientSecret={clientSecret} />
      </Elements>
    </div>
  );
};

export default PaymentStep;
