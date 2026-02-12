"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MainHeader } from "@/components/layouts/MainHeader";
import { MainSidebar } from "@/components/layouts/MainSidebar";
import { MainFooter } from "@/components/layouts/MainFooter";
import {
  DesignPreviewCard,
  DesignPreviewCardSkeleton,
} from "@/components/3d/DesignPreviewCard";
import { useFeaturedDesigns } from "./page.hooks";
import { useAuth } from "./layout.hooks";
import type { ModelData } from "./layout.types";

export default function HomePage() {
  useAuth();
  const { data: featuredDesigns, isLoading } = useFeaturedDesigns();

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader />
      <MainSidebar />

      <main className="flex-1 lg:ml-64">
        <section className="bg-gradient-to-br from-green-50 to-blue-50 py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Create Sustainable 3D Designs
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
              Design custom 3D models in your browser and bring them to life with
              eco-friendly, biodegradable materials
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/editor/new">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Creating
                </Button>
              </Link>
              <Link href="/gallery">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Browse Gallery
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Featured Designs
              </h2>
              <p className="text-gray-600">
                Explore creative 3D designs from our community
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <DesignPreviewCardSkeleton key={i} />
                ))}
              </div>
            ) : featuredDesigns && featuredDesigns.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredDesigns.map((design) => (
                  <DesignPreviewCard
                    key={design.id}
                    designId={design.id}
                    title={design.title}
                    creatorName={(design.creator as any)?.display_name || "Unknown"}
                    modelData={design.model_data as ModelData}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-600 mb-4">
                  No featured designs yet. Be the first to create and submit!
                </p>
                <Link href="/editor/new">
                  <Button>Create Design</Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="bg-gray-50 py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Why Eco3d.shop?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Browser-Based Editor</h3>
                <p className="text-gray-600 text-sm">
                  Create 3D models right in your browser with our intuitive editor
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Eco-Friendly Materials</h3>
                <p className="text-gray-600 text-sm">
                  All prints use biodegradable, sustainable materials
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Community Driven</h3>
                <p className="text-gray-600 text-sm">
                  Share your designs and discover creations from others
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  );
}
