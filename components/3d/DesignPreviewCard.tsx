"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ModelData } from "@/app/layout.types";
import { Simple3DViewer } from "./Simple3DViewer";
import { Skeleton } from "@/components/ui/skeleton";

type DesignPreviewCardProps = {
  designId: string;
  title: string;
  creatorName: string;
  modelData: ModelData;
};

export function DesignPreviewCard({
  designId,
  title,
  creatorName,
  modelData,
}: DesignPreviewCardProps) {
  const router = useRouter();

  const handleOpenInEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem("editorLoadDesign", JSON.stringify(modelData));
    router.push("/editor/new");
  };

  const handleCardClick = () => {
    router.push(`/gallery/${designId}`);
  };

  return (
    <div
      className="group bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="aspect-square bg-gray-50" onClick={(e) => e.stopPropagation()}>
        <Simple3DViewer modelData={modelData} height="100%" />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate mb-1">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-3">by {creatorName}</p>
        <div className="flex flex-col gap-3">
          <Link href={`/gallery/${designId}`} onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            onClick={handleOpenInEditor}
            className="w-full"
          >
            Open in Editor
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DesignPreviewCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
