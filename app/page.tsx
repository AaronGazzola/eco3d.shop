import Hero from "@/app/components/Hero";
import ProductsList from "@/app/components/ProductsList";
import { LandingPageSearchBar } from "@/components/searchbar";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <div className="w-full">
      <Hero />
      <div className="w-full relative">
        <div className="absolute w-[100%] md:w-[80%] max-w-[1060px] left-1/2 transform top-0 -translate-y-1/2 -translate-x-1/2">
          <LandingPageSearchBar />
        </div>
        <ProductsList className="py-[82px]" />
      </div>
    </div>
  );
}
