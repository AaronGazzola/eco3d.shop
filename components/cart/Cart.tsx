"use client";

import PaymentStep from "@/components/cart/PaymentStep";
import ReviewStep from "@/components/cart/ReviewStep";
import ShippingStep from "@/components/cart/ShippingStep";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/hooks/useCartStore";
import { useUIStore } from "@/hooks/useUIStore";
import { cn } from "@/lib/utils";
import { CartStep as CartStepEnum } from "@/types/ui.types";
import { ChevronDown, CreditCard, List, Truck } from "lucide-react";
import React, { useEffect, useState } from "react";

const COLLAPSED_STEP_HEIGHT = 65;

interface SectionProps {
  section: Section;
  index: number;
  isActive: boolean;
  activeSection: CartStepEnum;
  onSectionClick: (id: CartStepEnum) => void;
  isTransitioning: boolean;
  step: CartStepEnum;
}

type Section = {
  id: CartStepEnum;
  icon: React.ReactNode;
  label: string;
};

const sections: Section[] = [
  {
    id: CartStepEnum.Review,
    icon: <List className="w-6 h-6" />,
    label: CartStepEnum.Review,
  },
  {
    id: CartStepEnum.Shipping,
    icon: <Truck className="w-6 h-6" />,
    label: CartStepEnum.Shipping,
  },
  {
    id: CartStepEnum.Payment,
    icon: <CreditCard className="w-6 h-6" />,
    label: CartStepEnum.Payment,
  },
];

const SectionComponent: React.FC<SectionProps> = ({
  section,
  index,
  activeSection,
  onSectionClick,
  isTransitioning,
  step,
}) => {
  const { items, isEmailValid, isAddressValid } = useCartStore();
  const isActive = section.id === activeSection;
  const activeIndex = sections.findIndex((s) => s.id === activeSection);
  const currentIndex = sections.findIndex((s) => s.id === section.id);
  const isComplete = activeIndex > currentIndex;
  const isAtTop = isComplete || isActive;

  const showShippingButton =
    activeSection === CartStepEnum.Review &&
    section.id === CartStepEnum.Shipping;
  const showPaymentButton =
    (activeSection === CartStepEnum.Shipping &&
      section.id === CartStepEnum.Payment) ||
    (activeSection === CartStepEnum.Review &&
      section.id === CartStepEnum.Payment);
  const showButton = showShippingButton || showPaymentButton;
  const isDisabled =
    (activeSection === CartStepEnum.Review && !items.length) ||
    (activeSection === CartStepEnum.Shipping &&
      section.id === CartStepEnum.Payment &&
      (!isEmailValid || !isAddressValid)) ||
    (activeSection === CartStepEnum.Review &&
      section.id === CartStepEnum.Payment);

  const bottomHeight =
    section.id === CartStepEnum.Review
      ? COLLAPSED_STEP_HEIGHT * 3
      : section.id === CartStepEnum.Shipping
        ? COLLAPSED_STEP_HEIGHT * 2
        : COLLAPSED_STEP_HEIGHT;

  const top = isAtTop
    ? section.id === CartStepEnum.Review
      ? 0
      : section.id === CartStepEnum.Shipping
        ? COLLAPSED_STEP_HEIGHT
        : COLLAPSED_STEP_HEIGHT * 2
    : `calc(100% - ${bottomHeight}px)`;

  return (
    <div
      onClick={() => !isDisabled && onSectionClick(section.id)}
      className={cn(
        "absolute inset-0 transition-all duration-500 bg-white border border-gray-200 rounded-t-xl shadow-xl",
        !isDisabled && !isActive && "cursor-pointer",
        showButton &&
          !isDisabled &&
          "shadow-[0_-5px_15px_2px_rgba(22,101,52,0.2)]",
      )}
      style={{
        top,
        transition: "top 0.6s ease-in-out",
        zIndex: sections.findIndex((s) => s.id === section.id),
      }}
    >
      <div className="max-w-4xl w-full h-full mx-auto flex flex-col">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div
              className={cn(
                "flex items-center gap-4 text-2xl text-gray-800",
                isActive && "text-primary",
              )}
            >
              {React.cloneElement(section.icon as React.ReactElement, {
                className: cn("w-6 h-6", isActive && "text-primary"),
              })}
              <div className={cn("font-bold")}>{section.label}</div>
            </div>

            <div className="relative">
              <div className="absolute inset-0"></div>
              <Button
                size="sm"
                variant="default"
                disabled={isDisabled}
                className={cn(
                  "font-bold text-xl flex items-center gap-1 xs:gap-4 relative justify-around",
                  !showButton && "opacity-0 pointer-events-none",
                )}
              >
                <span className="mb-[3px]">Next</span>
                <ChevronDown className="w-5 h-5 stroke-[3px]" />
              </Button>
            </div>
          </div>
        </div>

        <div className={cn("flex-grow relative")}>
          <div
            style={{
              bottom: bottomHeight - COLLAPSED_STEP_HEIGHT,
            }}
            className={cn("absolute w-full top-0")}
          >
            {section.id === CartStepEnum.Review && (
              <ReviewStep
                activeStep={activeSection}
                isTransitioning={isTransitioning}
              />
            )}
            {section.id === CartStepEnum.Shipping && (
              <ShippingStep
                isTransitioning={isTransitioning}
                activeStep={activeSection}
              />
            )}
            {section.id === CartStepEnum.Payment && (
              <PaymentStep isTransitioning={isTransitioning} amount={100} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Cart(): JSX.Element {
  const [activeSection, setActiveSection] = useState<CartStepEnum>(
    CartStepEnum.Review,
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { isDrawerOpen } = useUIStore();
  const { items } = useCartStore();

  const handleSectionChange = (sectionId: CartStepEnum) => {
    setActiveSection((prev) => {
      setIsTransitioning(prev !== sectionId);
      return sectionId;
    });
    setTimeout(() => setIsTransitioning(false), 600);
  };

  useEffect(() => {
    if (!isDrawerOpen || !items.length) setActiveSection(CartStepEnum.Review);
  }, [isDrawerOpen, items]);

  return (
    <div className="relative w-full h-screen">
      {sections.map((section, index) => (
        <SectionComponent
          key={section.id}
          step={section.id}
          section={section}
          index={index}
          isActive={section.id === activeSection}
          activeSection={activeSection}
          onSectionClick={handleSectionChange}
          isTransitioning={isTransitioning}
        />
      ))}
    </div>
  );
}
