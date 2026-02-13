"use client";

import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Grid,
  TransformControls,
} from "@react-three/drei";
import * as THREE from "three";
import { useRef, useEffect } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type SceneObject = {
  id: string;
  type: "cube" | "sphere" | "cylinder";
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
};

type EditorCanvasProps = {
  sceneObjects: SceneObject[];
  selectedObjectId: string | null;
  transformMode: "translate" | "rotate" | "scale";
  onSelectObject: (id: string | null) => void;
  onUpdateObject: (id: string, updates: Partial<SceneObject>) => void;
};

function ObjectGeometry({ type }: { type: SceneObject["type"] }) {
  switch (type) {
    case "cube":
      return <boxGeometry args={[1, 1, 1]} />;
    case "sphere":
      return <sphereGeometry args={[0.5, 32, 32]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
  }
}

function SceneObjectMesh({
  obj,
  isSelected,
  onSelect,
  transformMode,
  onTransform,
}: {
  obj: SceneObject;
  isSelected: boolean;
  transformMode: "translate" | "rotate" | "scale";
  onSelect: () => void;
  onTransform: (updates: Partial<SceneObject>) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group>
      <mesh
        ref={meshRef}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <ObjectGeometry type={obj.type} />
        <meshStandardMaterial
          color={obj.color}
          emissive={isSelected ? obj.color : "#000000"}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>

      {isSelected && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode={transformMode}
          onObjectChange={() => {
            if (meshRef.current) {
              onTransform({
                position: meshRef.current.position.toArray(),
                rotation: meshRef.current.rotation.toArray() as [
                  number,
                  number,
                  number
                ],
                scale: meshRef.current.scale.toArray(),
              });
            }
          }}
        />
      )}
    </group>
  );
}

function EditorHelpPopover() {
  return (
    <div className="absolute top-3 right-3 z-10">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 text-sm">
          <p className="font-semibold mb-2">Editor Controls</p>
          <div className="space-y-3">
            <div>
              <p className="font-medium text-muted-foreground mb-1">Mouse</p>
              <ul className="space-y-0.5 text-xs">
                <li className="flex justify-between">
                  <span>Left click</span>
                  <span className="text-muted-foreground">Select object</span>
                </li>
                <li className="flex justify-between">
                  <span>Left drag gizmo</span>
                  <span className="text-muted-foreground">Transform</span>
                </li>
                <li className="flex justify-between">
                  <span>Right drag</span>
                  <span className="text-muted-foreground">Orbit camera</span>
                </li>
                <li className="flex justify-between">
                  <span>Middle drag</span>
                  <span className="text-muted-foreground">Pan camera</span>
                </li>
                <li className="flex justify-between">
                  <span>Scroll</span>
                  <span className="text-muted-foreground">Zoom</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-muted-foreground mb-1">Keyboard</p>
              <ul className="space-y-0.5 text-xs">
                <li className="flex justify-between">
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">W</kbd>
                  <span className="text-muted-foreground">Move</span>
                </li>
                <li className="flex justify-between">
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">E</kbd>
                  <span className="text-muted-foreground">Rotate</span>
                </li>
                <li className="flex justify-between">
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">R</kbd>
                  <span className="text-muted-foreground">Scale</span>
                </li>
                <li className="flex justify-between">
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Q</kbd>
                  <span className="text-muted-foreground">Select tool</span>
                </li>
                <li className="flex justify-between">
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Del</kbd>
                  <span className="text-muted-foreground">Delete object</span>
                </li>
                <li className="flex justify-between">
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
                  <span className="text-muted-foreground">Deselect</span>
                </li>
              </ul>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function EditorCanvas({
  sceneObjects,
  selectedObjectId,
  transformMode,
  onSelectObject,
  onUpdateObject,
}: EditorCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const onContextMenu = (e: Event) => {
      e.preventDefault();
    };

    el.addEventListener("contextmenu", onContextMenu);

    return () => {
      el.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full relative"
    >
    <EditorHelpPopover />
    <Canvas
      onPointerMissed={(e) => {
        if (e.button === 0) onSelectObject(null);
      }}
    >
      <PerspectiveCamera makeDefault position={[5, 5, 5]} />
      <OrbitControls
        makeDefault
        mouseButtons={{
          LEFT: undefined as unknown as THREE.MOUSE,
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
        maxPolarAngle={Math.PI / 2}
        minDistance={1}
        maxDistance={50}
      />

      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />

      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#374151"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
      />

      {sceneObjects.map((obj) => (
        <SceneObjectMesh
          key={obj.id}
          obj={obj}
          isSelected={obj.id === selectedObjectId}
          transformMode={transformMode}
          onSelect={() => onSelectObject(obj.id)}
          onTransform={(updates) => onUpdateObject(obj.id, updates)}
        />
      ))}
    </Canvas>
    </div>
  );
}
