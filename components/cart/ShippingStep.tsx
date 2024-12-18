"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/hooks/useCartStore";
import { cn } from "@/lib/utils";
import { CartStep } from "@/types/ui.types";
import { Autocomplete, LoadScript } from "@react-google-maps/api";
import { Clock, Printer, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

const libraries = ["places"];

interface Address {
  street: string;
  unit?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface ShippingStepProps {
  activeStep: CartStep;
  isTransitioning: boolean;
}

const formSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  unit: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z
    .string()
    .refine(
      (val) => val === "Australia",
      "Shipping is only available within Australia",
    ),
});

const emailSchema = z.string().email("Please enter a valid email address");

const ShippingStep = ({ activeStep, isTransitioning }: ShippingStepProps) => {
  const { setShippingEmail, setEmailValid, setAddressValid, shippingEmail } =
    useCartStore();
  const [email, setEmail] = useState(shippingEmail);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [address, setAddress] = useState<Address>({
    street: "",
    unit: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  useEffect(() => {
    try {
      emailSchema.parse(shippingEmail);
      setEmailValid(true);
    } catch {
      setEmailValid(false);
    }
  }, [shippingEmail, setEmailValid]);

  useEffect(() => {
    setEmail(shippingEmail);
  }, [shippingEmail]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setShippingEmail(newEmail);

    try {
      emailSchema.parse(newEmail);
      setEmailValid(true);
      if (emailTouched) {
        setEmailError(null);
      }
    } catch (error) {
      setEmailValid(false);
      if (emailTouched && error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
      }
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    try {
      emailSchema.parse(email);
      setEmailError(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
      }
    }
  };

  const handlePlaceSelect = () => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.address_components) {
      let newAddress = { ...address };
      newAddress.country = "Australia";
      let streetNumber = "";
      let route = "";

      place.address_components.forEach((component) => {
        const type = component.types[0];
        if (type === "subpremise") {
          newAddress.unit = component.long_name;
        } else if (type === "street_number") {
          streetNumber = component.long_name;
        } else if (type === "route") {
          route = component.long_name;
        } else if (type === "locality") {
          newAddress.city = component.long_name;
        } else if (type === "administrative_area_level_1") {
          newAddress.state = component.short_name;
        } else if (type === "postal_code") {
          newAddress.postalCode = component.long_name;
        } else if (type === "country") {
          newAddress.country = component.long_name;
        }
      });

      if (streetNumber.includes("/")) {
        const [unit, number] = streetNumber.split("/");
        newAddress.unit = unit;
        streetNumber = number;
      }

      newAddress.street = `${streetNumber} ${route}`.trim();
      setAddress(newAddress);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      formSchema.parse(address);
      emailSchema.parse(email);
    } catch (error) {
      return;
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
      libraries={libraries as any}
    >
      <div
        className={cn(
          "space-y-4 py-2 pb-8 px-6 overflow-y-auto absolute inset-0",
          isTransitioning && "overflow-y-hidden",
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              className={cn(emailError && "border-red-500")}
              required
            />
            {emailTouched && emailError && (
              <p className="text-sm text-red-500 mt-1">{emailError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Autocomplete
              onLoad={(auto) => {
                autocompleteRef.current = auto;
              }}
              onPlaceChanged={handlePlaceSelect}
              restrictions={{ country: ["au"] }}
            >
              <Input
                id="street"
                value={address.street}
                onChange={(e) =>
                  setAddress((prev) => ({ ...prev, street: e.target.value }))
                }
                required
              />
            </Autocomplete>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit/Apt (Optional)</Label>
            <Input
              id="unit"
              value={address.unit}
              onChange={(e) =>
                setAddress((prev) => ({ ...prev, unit: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={address.city}
                onChange={(e) =>
                  setAddress((prev) => ({ ...prev, city: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={address.state}
                onChange={(e) =>
                  setAddress((prev) => ({ ...prev, state: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={address.postalCode}
                onChange={(e) =>
                  setAddress((prev) => ({
                    ...prev,
                    postalCode: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={address.country}
                onChange={(e) =>
                  setAddress((prev) => ({ ...prev, country: e.target.value }))
                }
                required
              />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-8 pt-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-muted-foreground font-medium">
                Queue time:
              </span>
              <span className="bg-gray-100 rounded-full flex items-center gap-1.5 justify-center text-gray-900 px-3 py-2">
                <Clock className="w-5 h-5" />
                36d 37h 12m
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-muted-foreground font-medium">
                Print time:
              </span>
              <span className="bg-gray-100 rounded-full flex items-center gap-1.5 justify-center text-gray-900 px-3 py-2">
                <Printer className="w-5 h-5" />
                36d 37h 12m
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-muted-foreground font-medium">
                Delivery time:
              </span>
              <span className="bg-gray-100 rounded-full flex items-center gap-1.5 justify-center text-gray-900 px-3 py-2">
                <Truck className="w-5 h-5" />
                36d
              </span>
            </div>
          </div>
          <div className="space-y-2 text-center pt-4">
            <p className="text-lg font-medium">Est. Delivery: 25 Nov 2024</p>
          </div>
        </form>
      </div>
    </LoadScript>
  );
};

export default ShippingStep;
