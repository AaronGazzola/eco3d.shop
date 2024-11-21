import Hero from "./components/Hero";
import ProductsList from "./components/ProductsList";

export default function Home() {
  return (
    <div className="w-full">
      <Hero />
      <ProductsList />
    </div>
  );
}
