"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMyProjectsAction,
  createProjectAction,
  deleteProjectAction,
} from "./page.actions";
import { CustomToast } from "@/components/CustomToast";

export function useMyProjects(enabled: boolean = true) {
  return useQuery({
    queryKey: ["myProjects"],
    queryFn: () => getMyProjectsAction(),
    enabled,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => createProjectAction(),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
      toast.custom(() => (
        <CustomToast
          variant="success"
          title="Project created"
          message="Opening editor..."
        />
      ));
      window.location.href = `/editor/${newProject.id}`;
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Failed to create project"
          message={error.message}
        />
      ));
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => deleteProjectAction(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
      toast.custom(() => (
        <CustomToast
          variant="success"
          title="Project deleted"
          message="Project has been removed"
        />
      ));
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Failed to delete project"
          message={error.message}
        />
      ));
    },
  });
}
