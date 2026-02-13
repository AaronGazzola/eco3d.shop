"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MainHeader } from "@/components/layouts/MainHeader";
import { useAuth } from "@/app/layout.hooks";
import { useEditorStore } from "./page.stores";
import { useProject, useSaveProject, useSubmitDesign } from "./page.hooks";
import { EditorCanvas } from "@/components/3d/EditorCanvas";
import { EditorToolbar } from "@/components/3d/EditorToolbar";
import { createProjectAction } from "@/app/projects/page.actions";
import type { EditorTool, SceneObject } from "./page.types";
import type { ModelData } from "@/app/layout.types";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function exportSceneToGLB(sceneObjects: SceneObject[]): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const scene = new THREE.Scene();

    sceneObjects.forEach((obj) => {
      let geometry: THREE.BufferGeometry;
      switch (obj.type) {
        case "cube":
          geometry = new THREE.BoxGeometry(1, 1, 1);
          break;
        case "sphere":
          geometry = new THREE.SphereGeometry(0.5, 32, 32);
          break;
        case "cylinder":
          geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
          break;
      }

      const material = new THREE.MeshStandardMaterial({ color: obj.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...obj.position);
      mesh.rotation.set(...obj.rotation);
      mesh.scale.set(...obj.scale);
      scene.add(mesh);
    });

    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          reject(new Error("Expected ArrayBuffer from GLTFExporter"));
        }
      },
      (error) => reject(error),
      { binary: true }
    );
  });
}

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;

  const { data: user, isLoading: authLoading } = useAuth();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const saveProject = useSaveProject();
  const submitDesign = useSubmitDesign(projectId);

  const [currentProjectId, setCurrentProjectId] = useState(projectId);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitDescription, setSubmitDescription] = useState("");
  const autoSaveInterval = useRef<NodeJS.Timeout | null>(null);

  const {
    sceneObjects,
    selectedObjectId,
    currentTool,
    transformMode,
    addObject,
    updateObject,
    removeObject,
    setSelectedObjectId,
    setCurrentTool,
    setTransformMode,
    setSceneObjects,
  } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "q":
          setCurrentTool("select");
          break;
        case "w":
          setTransformMode("translate");
          break;
        case "e":
          setTransformMode("rotate");
          break;
        case "r":
          setTransformMode("scale");
          break;
        case "delete":
        case "backspace":
          if (selectedObjectId) {
            removeObject(selectedObjectId);
          }
          break;
        case "escape":
          setSelectedObjectId(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedObjectId,
    removeObject,
    setSelectedObjectId,
    setCurrentTool,
    setTransformMode,
  ]);

  // Removed auth redirect - editor is accessible to everyone
  // Saving and publishing will require authentication

  useEffect(() => {
    if (projectId === "new") {
      if (user) {
        createProjectAction().then((newProject) => {
          setCurrentProjectId(newProject.id);
          router.replace(`/editor/${newProject.id}`);
        }).catch((error) => {
          console.error("Failed to create project:", error);
          setCurrentProjectId("guest");
        });
      } else {
        setCurrentProjectId("guest");
      }
    }
  }, [projectId, router, user]);

  useEffect(() => {
    if (project?.model_data) {
      const modelData = project.model_data as ModelData;
      if (modelData.type === "scene-graph" && modelData.objects) {
        setSceneObjects(modelData.objects);
      }
    }
  }, [project, setSceneObjects]);

  useEffect(() => {
    if (projectId === "new" && currentProjectId === "guest") {
      const storedDesign = sessionStorage.getItem("editorLoadDesign");
      if (storedDesign) {
        try {
          const modelData = JSON.parse(storedDesign) as ModelData;
          if (modelData.type === "scene-graph" && modelData.objects) {
            setSceneObjects(modelData.objects);
          }
          sessionStorage.removeItem("editorLoadDesign");
        } catch (error) {
          console.error("Failed to load design:", error);
        }
      }
    }
  }, [projectId, currentProjectId, setSceneObjects]);

  useEffect(() => {
    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) {
      router.push("/sign-in");
      return;
    }

    try {
      const modelData: ModelData = {
        type: "scene-graph",
        objects: sceneObjects,
        metadata: {
          objectCount: sceneObjects.length,
        },
      };

      let projectIdToSave = currentProjectId;

      if (currentProjectId === "new" || currentProjectId === "guest") {
        const newProject = await createProjectAction();
        projectIdToSave = newProject.id;
        setCurrentProjectId(newProject.id);
        router.replace(`/editor/${newProject.id}`);
      }

      await saveProject.mutateAsync({
        projectId: projectIdToSave,
        updates: {
          model_data: modelData,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Save failed:", error);
    }
  }, [currentProjectId, sceneObjects, saveProject, user, router]);

  useEffect(() => {
    if (!user) return;

    autoSaveInterval.current = setInterval(() => {
      if (sceneObjects.length > 0) {
        handleSave();
      }
    }, 30000);

    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
    };
  }, [sceneObjects, handleSave, user]);

  const handleToolChange = (tool: EditorTool) => {
    setCurrentTool(tool);

    if (tool === "addCube" || tool === "addSphere" || tool === "addCylinder") {
      const newObject: SceneObject = {
        id: `${Date.now()}-${Math.random()}`,
        type: tool.replace("add", "").toLowerCase() as "cube" | "sphere" | "cylinder",
        position: [0, 0.5, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: "#4ade80",
      };
      addObject(newObject);
      setCurrentTool("select");
    }
  };

  const handleExport = async () => {
    try {
      const glb = await exportSceneToGLB(sceneObjects);
      const blob = new Blob([glb], { type: "model/gltf-binary" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.title || "model"}.glb`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleSubmit = () => {
    if (!user) {
      router.push("/sign-in");
      return;
    }

    setSubmitTitle(project?.title || "");
    setSubmitDescription(project?.description || "");
    setIsSubmitDialogOpen(true);
  };

  const handleSubmitConfirm = async () => {
    await handleSave();
    await submitDesign.mutateAsync({
      title: submitTitle,
      description: submitDescription,
    });
    setIsSubmitDialogOpen(false);
  };

  if (projectLoading || (currentProjectId === "new" && projectId === "new")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <MainHeader />

      <EditorToolbar
        currentTool={currentTool}
        transformMode={transformMode}
        onToolChange={handleToolChange}
        onTransformModeChange={setTransformMode}
        onSave={handleSave}
        onSubmit={handleSubmit}
        onExport={handleExport}
        isSaving={saveProject.isPending}
        isSubmitting={submitDesign.isPending}
      />

      <div className="flex-1 relative">
        <EditorCanvas
          sceneObjects={sceneObjects}
          selectedObjectId={selectedObjectId}
          transformMode={transformMode}
          onSelectObject={setSelectedObjectId}
          onUpdateObject={updateObject}
        />
      </div>

      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Design for Review</DialogTitle>
            <DialogDescription>
              Your design will be reviewed by our team before being published to the gallery
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={submitTitle}
                onChange={(e) => setSubmitTitle(e.target.value)}
                placeholder="My Amazing Design"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={submitDescription}
                onChange={(e) => setSubmitDescription(e.target.value)}
                placeholder="Describe your design..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitConfirm}
              disabled={!submitTitle || submitDesign.isPending}
            >
              {submitDesign.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
