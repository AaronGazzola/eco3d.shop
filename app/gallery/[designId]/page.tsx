"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MainHeader } from "@/components/layouts/MainHeader";
import { MainSidebar } from "@/components/layouts/MainSidebar";
import { MainFooter } from "@/components/layouts/MainFooter";
import { Simple3DViewer } from "@/components/3d/Simple3DViewer";
import { useAuth } from "@/app/layout.hooks";
import { usePublishedDesign } from "./page.hooks";
import { createProjectAction } from "@/app/projects/page.actions";
import { saveProjectAction } from "@/app/editor/[projectId]/page.actions";
import type { ModelData } from "@/app/layout.types";
import { toast } from "sonner";
import { CustomToast } from "@/components/CustomToast";
import { useState } from "react";

export default function DesignDetailPage() {
  useAuth();
  const router = useRouter();
  const params = useParams();
  const designId = params?.designId as string;
  const { data: design, isLoading } = usePublishedDesign(designId);
  const { data: user } = useAuth();
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const handleEditDesign = async () => {
    if (!design?.model_data) {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Error"
          message="This design has no model data"
        />
      ));
      return;
    }

    const modelData = design.model_data as ModelData;

    if (!user) {
      sessionStorage.setItem("editorLoadDesign", JSON.stringify(modelData));
      router.push("/editor/new");
      return;
    }

    setIsCreatingProject(true);
    try {
      const newProject = await createProjectAction();

      await saveProjectAction(newProject.id, {
        title: `Copy of ${design.title}`,
        description: design.description || "",
        model_data: modelData,
        updated_at: new Date().toISOString(),
      });

      router.push(`/editor/${newProject.id}`);
    } catch (error) {
      console.error("Failed to copy design:", error);
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Error"
          message="Failed to copy design"
        />
      ));
      setIsCreatingProject(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading design...</p>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="flex flex-col min-h-screen">
        <MainHeader />
        <MainSidebar />

        <main className="flex-1 lg:ml-64">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Design Not Found
              </h2>
              <p className="text-gray-600 mb-4">
                This design may not exist or has not been published yet
              </p>
              <Link href="/gallery">
                <Button>Back to Gallery</Button>
              </Link>
            </div>
          </div>
        </main>

        <MainFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader />
      <MainSidebar />

      <main className="flex-1 lg:ml-64">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-4">
            <Link href="/gallery">
              <Button variant="ghost" size="sm">
                ← Back to Gallery
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-50 rounded-lg overflow-hidden aspect-square">
              <Simple3DViewer
                modelData={design.model_data as ModelData}
                height="100%"
              />
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {design.title}
                </h1>
                <p className="text-gray-600">
                  by{" "}
                  <span className="font-medium">
                    {(design.creator as any)?.display_name || "Unknown"}
                  </span>
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Description
                </h2>
                <p className="text-gray-700">
                  {design.description || "No description provided"}
                </p>
              </div>

              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  About This Design
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Published</span>
                    <span className="font-medium text-gray-900">
                      {new Date(design.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Published
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Love this design? Open it in the editor or create your own!
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleEditDesign}
                  disabled={isCreatingProject}
                >
                  {isCreatingProject ? "Loading..." : "Open in Editor"}
                </Button>
                <Link href="/editor/new">
                  <Button className="w-full">Create Your Own Design</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <MainFooter />
    </div>
  );
}
