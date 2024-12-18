"use client";

import TShape2 from "@/assets/svg/icons/hero-t-shape-2.svg";
import SendArrow from "@/assets/svg/icons/send-arrow.svg";
import { cn } from "@/lib/utils";
import {
  Pencil,
  Ruler,
  ShoppingBasket,
  SquareMousePointer,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

enum CircleSide {
  Top,
  Right,
  Bottom,
  Left,
}

const images = [
  "/images/products/Digger/Aaron Set 2-5.jpg",
  "/images/products/V8/Set 3 second shoot-38.jpg",
  "/images/products/V8/details/Aaron set 3-29.jpg",
  "/images/promo/Aaron Set 1 Sept 20-35.jpg",
];

const { Top, Right, Bottom, Left } = CircleSide;

const Annotation = ({
  className,
  icon,
  label,
  isActive,
}: {
  icon: React.ReactNode;
  label: string;
  className?: string;
  isActive?: boolean;
}) => (
  <div
    className={cn(
      className,
      "transition-transform delay-150 duration-300",
      isActive ? "scale-125" : "",
    )}
  >
    <div
      className={cn(
        "sm:pt-2 pt-1.5 sm:pb-3 pb-2.5 sm:pl-3.5 pl-3 sm:pr-4 pr-3.5 rounded-lg shadow-xl text-sm space-y-1 flex items-center gap-2 transition-all delay-300 duration-150 border-2 font-bold",
        isActive
          ? "sm:text-base bg-white text-primary border-primary"
          : "bg-black text-white font-semibold border-transparent",
      )}
    >
      <span>{icon}</span>
      <span className="pb-0.5 text-nowrap leading-none">{label}</span>
    </div>
  </div>
);

const Hero = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldDisableAnimation = useRef(!!searchParams.get("disableAnimation"));
  const [circleSideAtTop, setCircleSideAtTop] = useState<CircleSide>(Top);
  const [rotation, setRotation] = useState(0);
  const [isTouched, setIsTouched] = useState(false);
  const [hasCompletedInitialAnimation, setHasCompletedInitialAnimation] =
    useState(shouldDisableAnimation.current);
  const [isInitialDelay, setIsInitialDelay] = useState(
    !shouldDisableAnimation.current,
  );

  useEffect(() => {
    if (searchParams.get("disableAnimation")) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("disableAnimation");
      router.replace(`?${newParams.toString()}`, { scroll: false });
    }
  }, [router, searchParams]);

  const rotate = useCallback(() => {
    setRotation((prev) => {
      const newRotation = prev - 90;
      const isFullRotation = Math.abs(newRotation) >= 360;
      if (isFullRotation) {
        if (!hasCompletedInitialAnimation) {
          setHasCompletedInitialAnimation(true);
        }
        return 0;
      }
      return newRotation;
    });
    setCircleSideAtTop((prev) => (prev === Left ? Top : prev + 1));
  }, [hasCompletedInitialAnimation]);

  const handleClick = () => {
    if (!hasCompletedInitialAnimation) return;
    setIsTouched(true);
    rotate();
  };

  useEffect(() => {
    if (shouldDisableAnimation.current) return;

    const startDelay = setTimeout(() => {
      setIsInitialDelay(false);
    }, 1000);

    return () => clearTimeout(startDelay);
  }, []);

  useEffect(() => {
    if (isInitialDelay || hasCompletedInitialAnimation) return;

    const rotationInterval = setInterval(rotate, 1000);
    return () => clearInterval(rotationInterval);
  }, [isInitialDelay, hasCompletedInitialAnimation, rotate]);

  const arrowClassName = hasCompletedInitialAnimation
    ? "fill-white"
    : "fill-black";

  return (
    <section
      onClick={handleClick}
      className={cn(
        "relative shadow-[inset_0_0_0_3000px_rgb(0,0,0,0.6)] py-8 pb-14 sm:py-16 flex items-center justify-center overflow-hidden",
      )}
    >
      <div className="absolute inset-0 shadow-lg"></div>

      <div className="absolute inset-0 -z-10 lg:hidden">
        <Image
          src="/images/promo/Aaron Set 1 Sept 20-52.jpg"
          alt="Hero Background"
          className="object-cover"
          fill
        />
      </div>
      <div className="absolute inset-0 -z-10 hidden lg:block">
        <Image
          src="/images/promo/Aaron_Sept_20_19.jpg"
          alt="Hero Background"
          className="object-cover"
          fill
        />
      </div>

      <div className="flex flex-col lg:flex-row items-center max-w-6xl">
        <div className="w-full max-w-2xl lg:w-1/2 px-6 sm:pl-16 sm:pr-20 pb-8 sm:pb-10 pt-2">
          <div className="text-white space-y-6 p-6 bg-black/60 rounded-xl">
            <div className="max-w-[520px]">
              <h1 className="font-semibold text-4xl">
                <span className="">Made to last years,</span>
                <br />
                <span className="text-hero">not centuries.</span>
              </h1>
              <p className="font-medium text-xl mt-2">
                Our 3D printed gifts provide years of enjoyment - eventually
                returning to the Earth to feed new life.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full lg:pr-10 lg:w-1/2 flex items-center justify-center">
          <div className="w-72 h-72 xs:w-80 xs:h-80 sm:w-[450px] sm:h-[450px] relative flex cursor-pointer justify-center items-center">
            <TShape2 className="h-full w-full absolute top-2 -left-10" />
            <TShape2 className="h-full w-full absolute top-5 -right-10 rotate-180" />
            <div className="absolute inset-0">
              <div className="rounded-full border-[4px] border-t-transparent border-white overflow-hidden relative h-full w-full">
                <div className="absolute inset-0">
                  {images.map((image, index) => (
                    <Image
                      key={index}
                      src={image}
                      alt="Hero Background"
                      className={cn(
                        "object-cover transition-opacity duration-1000 ease-in-out",
                        index === circleSideAtTop ? "opacity-100" : "opacity-0",
                      )}
                      fill
                    />
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent h-24" />
                <div className="absolute inset-0 rounded-full shadow-[inset_0_0_60px_25px_rgba(0,0,0,0.6)]" />
              </div>
              <div className="absolute inset-0 z-10">
                <Annotation
                  className="absolute top-10 left-0"
                  icon={<SquareMousePointer width={20} height={20} />}
                  label="Select"
                  isActive={circleSideAtTop === Top}
                />
                <Annotation
                  className="absolute bottom-16 -left-10"
                  icon={<Ruler width={20} height={20} />}
                  label="Customise"
                  isActive={circleSideAtTop === Right}
                />
                <Annotation
                  className="absolute bottom-20 -right-10 transform translate-y-6"
                  icon={<Pencil width={20} height={20} />}
                  label="Personalise"
                  isActive={circleSideAtTop === Bottom}
                />
                <Annotation
                  className="absolute right-0 top-10"
                  icon={<ShoppingBasket width={20} height={20} />}
                  label="Add to cart"
                  isActive={circleSideAtTop === Left}
                />
              </div>
              <div
                className="absolute inset-0 transition-transform duration-1000 ease-in-out"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <SendArrow
                  className={cn(
                    "absolute left-1/2 -translate-y-1/2 -translate-x-1/2 top-0 rotate-[-291deg] transition-opacity ease-in fill-white",
                    circleSideAtTop === Top ? "opacity-0" : "delay-300",
                    arrowClassName,
                  )}
                />
                <SendArrow
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 translate-x-1/2 right-0 rotate-[-201deg] transition-opacity ease-in fill-white",
                    circleSideAtTop === Right ? "opacity-0" : "delay-300",
                    arrowClassName,
                  )}
                />
                <SendArrow
                  className={cn(
                    "absolute left-1/2 translate-y-1/2 -translate-x-1/2 bottom-0 rotate-[-111deg] transition-opacity ease-in fill-white",
                    circleSideAtTop === Bottom ? "opacity-0" : "delay-300",
                    arrowClassName,
                  )}
                />
                <SendArrow
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-0 rotate-[-21deg] transition-opacity ease-in",
                    circleSideAtTop === Left ? "opacity-0" : "delay-300",
                    arrowClassName,
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
