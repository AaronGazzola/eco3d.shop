"use client";

import { MainHeader } from "@/components/layouts/MainHeader";
import { MainSidebar } from "@/components/layouts/MainSidebar";
import { MainFooter } from "@/components/layouts/MainFooter";
import {
  DesignPreviewCard,
  DesignPreviewCardSkeleton,
} from "@/components/3d/DesignPreviewCard";
import { useAuth } from "@/app/layout.hooks";
import { usePublishedDesigns } from "./page.hooks";
import type { ModelData } from "@/app/layout.types";

export default function GalleryPage() {
  useAuth();
  const { data: designs, isLoading } = usePublishedDesigns();

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader />
      <MainSidebar />

      <main className="flex-1 lg:ml-64">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Community Gallery
            </h1>
            <p className="text-gray-600">
              Browse creative 3D designs from our community
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <DesignPreviewCardSkeleton key={i} />
              ))}
            </div>
          ) : designs && designs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {designs.map((design) => (
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
              <p className="text-gray-600">
                No published designs yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      </main>

      <MainFooter />
    </div>
  );
}
