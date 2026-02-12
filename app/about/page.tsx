import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            ← Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">About Eco3d.shop</h1>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6 prose prose-gray max-w-none">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700">
              At Eco3d.shop, we believe in the power of sustainable technology to create a better future. Our mission is to make 3D design and printing accessible to everyone while maintaining our commitment to environmental responsibility.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Sustainability First</h2>
            <p className="text-gray-700">
              We exclusively use biodegradable, eco-friendly materials for all our 3D prints. Our commitment to sustainability extends beyond materials – we continuously work to reduce waste, minimize energy consumption, and promote environmentally conscious design practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Community Driven</h2>
            <p className="text-gray-700">
              Our platform is built on the creativity and collaboration of our community. We provide the tools for designers to create, share, and bring their ideas to life, while fostering a supportive environment for learning and growth.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Innovation & Accessibility</h2>
            <p className="text-gray-700">
              With our browser-based 3D editor, anyone can start designing without expensive software or technical expertise. We're committed to breaking down barriers and making 3D design accessible to creators of all skill levels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
