"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MainHeader } from "@/components/layouts/MainHeader";
import { MainSidebar } from "@/components/layouts/MainSidebar";
import { MainFooter } from "@/components/layouts/MainFooter";
import { useAuth } from "@/app/layout.hooks";
import { useMyProjects, useCreateProject, useDeleteProject } from "./page.hooks";
import { Simple3DViewer } from "@/components/3d/Simple3DViewer";
import type { ModelData } from "@/app/layout.types";
import type { ProjectWithStatus } from "./page.types";

function ProjectCard({ project }: { project: ProjectWithStatus }) {
  const deleteProject = useDeleteProject();
  const hasModelData = project.model_data && typeof project.model_data === "object";

  const getStatusBadge = () => {
    if (Array.isArray(project.published) && project.published.length > 0) {
      const status = project.published[0].status;
      const colors: Record<string, string> = {
        draft: "bg-gray-100 text-gray-800",
        pending: "bg-yellow-100 text-yellow-800",
        published: "bg-green-100 text-green-800",
        rejected: "bg-red-100 text-red-800",
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">{project.title}</CardTitle>
            <CardDescription className="truncate">
              {project.description || "No description"}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        {hasModelData ? (
          <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
            <Simple3DViewer modelData={project.model_data as ModelData} height="100%" />
          </div>
        ) : (
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500 text-sm">No 3D model yet</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link href={`/editor/${project.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            Edit
          </Button>
        </Link>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm("Are you sure you want to delete this project?")) {
              deleteProject.mutate(project.id);
            }
          }}
          disabled={deleteProject.isPending}
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}

function ProjectCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="aspect-square w-full" />
      </CardContent>
      <CardFooter className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-20" />
      </CardFooter>
    </Card>
  );
}

export default function ProjectsPage() {
  const { data: user } = useAuth();
  const { data: projects, isLoading: projectsLoading } = useMyProjects(!!user);
  const createProject = useCreateProject();

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader />
      <MainSidebar />

      <main className="flex-1 lg:ml-64">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
              <p className="text-gray-600 mt-1">
                Manage your 3D design projects
              </p>
            </div>
            {user && (
              <Button
                onClick={() => createProject.mutate()}
                disabled={createProject.isPending}
              >
                {createProject.isPending ? "Creating..." : "New Project"}
              </Button>
            )}
          </div>

          {projectsLoading && user ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          ) : hasProjects ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project as any} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No projects saved yet
              </h3>
              <p className="text-gray-600 mb-4">
                {user
                  ? "Create your first 3D design project to get started"
                  : "Sign in to save and manage your 3D design projects"}
              </p>
              <Link href="/editor/new">
                <Button>Create a new project</Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <MainFooter />
    </div>
  );
}
