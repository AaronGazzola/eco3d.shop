"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getProjectAction,
  saveProjectAction,
  submitDesignAction,
} from "./page.actions";
import type { ProjectUpdate } from "@/app/layout.types";
import { CustomToast } from "@/components/CustomToast";

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectAction(projectId),
    enabled: projectId !== "new" && projectId !== "guest",
  });
}

export function useSaveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, updates }: { projectId: string; updates: ProjectUpdate }) =>
      saveProjectAction(projectId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Failed to save"
          message={error.message}
        />
      ));
    },
  });
}

export function useSubmitDesign(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, description }: { title: string; description: string }) =>
      submitDesignAction(projectId, title, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
      toast.custom(() => (
        <CustomToast
          variant="success"
          title="Design submitted"
          message="Your design has been submitted for review"
        />
      ));
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Failed to submit"
          message={error.message}
        />
      ));
    },
  });
}
