import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { ModelData } from "@/app/layout.types";

export async function convertGLBToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function base64ToBlob(base64: string): Blob {
  const cleanBase64 = base64.replace(/\s/g, "").trim();

  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: "model/gltf-binary" });
}

export function base64ToObjectURL(base64: string): string {
  const blob = base64ToBlob(base64);
  return URL.createObjectURL(blob);
}

async function exportSceneToGLB(scene: THREE.Scene): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function calculateBoundingBox(
  geometry: THREE.BufferGeometry
): NonNullable<NonNullable<ModelData["metadata"]>["boundingBox"]> {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  return {
    min: [box.min.x, box.min.y, box.min.z],
    max: [box.max.x, box.max.y, box.max.z],
  };
}

export async function createBasicCube(): Promise<ModelData> {
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x4ade80 });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const glb = await exportSceneToGLB(scene);
  const glbBase64 = arrayBufferToBase64(glb);

  geometry.computeBoundingBox();

  return {
    type: "glb",
    glbBase64,
    metadata: {
      vertices: geometry.attributes.position.count,
      faces: geometry.index ? geometry.index.count / 3 : 0,
      boundingBox: calculateBoundingBox(geometry),
    },
  };
}

export async function createBasicSphere(): Promise<ModelData> {
  const scene = new THREE.Scene();
  const geometry = new THREE.SphereGeometry(0.5, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0x60a5fa });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const glb = await exportSceneToGLB(scene);
  const glbBase64 = arrayBufferToBase64(glb);

  return {
    type: "glb",
    glbBase64,
    metadata: {
      vertices: geometry.attributes.position.count,
      faces: geometry.index ? geometry.index.count / 3 : 0,
      boundingBox: calculateBoundingBox(geometry),
    },
  };
}

export async function createBasicCylinder(): Promise<ModelData> {
  const scene = new THREE.Scene();
  const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0xf472b6 });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const glb = await exportSceneToGLB(scene);
  const glbBase64 = arrayBufferToBase64(glb);

  return {
    type: "glb",
    glbBase64,
    metadata: {
      vertices: geometry.attributes.position.count,
      faces: geometry.index ? geometry.index.count / 3 : 0,
      boundingBox: calculateBoundingBox(geometry),
    },
  };
}
