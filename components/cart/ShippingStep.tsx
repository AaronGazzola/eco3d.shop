"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CartStep } from "@/types/ui.types";
import { Autocomplete, LoadScript } from "@react-google-maps/api";
import { useRef, useState } from "react";
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

const formSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  unit: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

const ShippingStep = ({ activeStep }: { activeStep: CartStep }) => {
  const [address, setAddress] = useState<Address>({
    street: "",
    unit: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceSelect = () => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.address_components) {
      let newAddress = { ...address };
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
    } catch (error) {
      return;
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
      libraries={libraries as any}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 px-1 xs:px-2 h-full flex flex-col items-stretch mt-2"
      >
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
                setAddress((prev) => ({ ...prev, postalCode: e.target.value }))
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
        {/* 
        <div className="space-y-2 text-center pt-4 border">
          <p className="text-lg font-medium">Est. Delivery: 25 Nov 2024</p>
          <div className="flex items-center justify-center gap-2">
            <span>Delivery within Australia only</span>
            <Australia className="h-6 w-6" />
          </div>
        </div> */}
      </form>
    </LoadScript>
  );
};

export default ShippingStep;
