"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CartStep } from "@/types/ui.types";
import { Autocomplete, LoadScript } from "@react-google-maps/api";
import { useRef, useState } from "react";

const libraries = ["places"];

interface Address {
  street: string;
  unit?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const ShippingStep = ({ activeStep }: { activeStep: CartStep }) => {
  const [address, setAddress] = useState<Address>({
    street: "",
    unit: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    email: "",
  });
  const [emailError, setEmailError] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
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

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!EMAIL_REGEX.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setAddress((prev) => ({ ...prev, email }));
    if (email) validateEmail(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(address.email)) {
      return;
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
      libraries={libraries as any}
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-4 mb-10">
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

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={address.email}
            onChange={handleEmailChange}
            onBlur={() => validateEmail(address.email)}
            required
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "email-error" : undefined}
          />
          {emailError && (
            <p id="email-error" className="text-sm text-destructive">
              {emailError}
            </p>
          )}
        </div>
      </form>
    </LoadScript>
  );
};

export default ShippingStep;
