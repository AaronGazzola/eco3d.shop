"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/app/layout.hooks";
import { useCompleteProfile } from "./page.hooks";

const welcomeSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

export default function WelcomePage() {
  const router = useRouter();
  const { data: user, isLoading } = useAuth();
  const completeProfile = useCompleteProfile();

  const form = useForm({
    resolver: zodResolver(welcomeSchema),
    defaultValues: {
      displayName: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "",
    },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/sign-in");
    }
  }, [user, isLoading, router]);

  const onSubmit = (data: z.infer<typeof welcomeSchema>) => {
    const shippingAddress =
      data.street || data.city || data.state || data.zip || data.country
        ? {
            street: data.street || "",
            city: data.city || "",
            state: data.state || "",
            zip: data.zip || "",
            country: data.country || "",
          }
        : undefined;

    completeProfile.mutate({
      display_name: data.displayName,
      shipping_address: shippingAddress,
    });
  };

  if (isLoading) {
    return (
      <div className="text-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2 text-center">Welcome!</h2>
      <p className="text-sm text-gray-600 mb-6 text-center">
        Let's set up your profile to get started
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="displayName">
            Display Name <span className="text-red-600">*</span>
          </Label>
          <Input
            id="displayName"
            placeholder="John Doe"
            {...form.register("displayName")}
          />
          {form.formState.errors.displayName && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.displayName.message}
            </p>
          )}
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3 text-gray-700">
            Shipping Address (Optional)
          </p>

          <div className="space-y-3">
            <div>
              <Label htmlFor="street">Street</Label>
              <Input
                id="street"
                placeholder="123 Main St"
                {...form.register("street")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="City" {...form.register("city")} />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="State"
                  {...form.register("state")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input id="zip" placeholder="12345" {...form.register("zip")} />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="Country"
                  {...form.register("country")}
                />
              </div>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={completeProfile.isPending}>
          {completeProfile.isPending ? "Setting up..." : "Complete Setup"}
        </Button>
      </form>
    </div>
  );
}
