import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  INITIAL_COLLISION_SPHERES, INITIAL_FRONT_CONNECTION, INITIAL_BACK_CONNECTION,
  INITIAL_FRONT_POINTS, INITIAL_BACK_POINTS,
  DEFAULT_PHYSICS_PARAMS, DEFAULT_BODY_CONNECTION_PARAMS, DEFAULT_BODY_TO_BODY_CONNECTION_PARAMS,
  DEFAULT_BODY_TO_TAIL_CONNECTION_PARAMS, DEFAULT_HEAD_BODY_LIMITS, DEFAULT_BODY_BODY_LIMITS,
  DEFAULT_BODY_TAIL_LIMITS,
} from "./page.stores.data";

export interface Sphere {
  id: string;
  position: [number, number, number];
  radius: number;
}

export interface ColumnShape {
  center: [number, number, number];
  height: number;
  radius: number;
  curve: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
}

export type ViewMode = "play" | "head" | "body" | "tail";

type SphereCollection = Record<string, Sphere[]>;

function makeSphereActions(key: keyof PageState, set: (fn: (s: PageState) => Partial<PageState>) => void) {
  return {
    add: (segmentKey: string) =>
      set((state) => {
        const existing = (state[key] as SphereCollection)[segmentKey] ?? [];
        const newSphere: Sphere = {
          id: `${Date.now()}-${Math.random()}`,
          position: [0, 0, 0],
          radius: 0.2,
        };
        return { [key]: { ...(state[key] as SphereCollection), [segmentKey]: [...existing, newSphere] } };
      }),
    update: (segmentKey: string, id: string, updates: Partial<Pick<Sphere, "position" | "radius">>) =>
      set((state) => {
        const existing = (state[key] as SphereCollection)[segmentKey] ?? [];
        return {
          [key]: {
            ...(state[key] as SphereCollection),
            [segmentKey]: existing.map((s) => (s.id === id ? { ...s, ...updates } : s)),
          },
        };
      }),
    remove: (segmentKey: string, id: string) =>
      set((state) => {
        const existing = (state[key] as SphereCollection)[segmentKey] ?? [];
        return {
          [key]: {
            ...(state[key] as SphereCollection),
            [segmentKey]: existing.filter((s) => s.id !== id),
          },
        };
      }),
  };
}

export interface PhysicsParams {
  cursorStiffness: number;
  cursorDamping: number;
  segmentDamping: number;
  followSpeed: number;
}

export interface BodyConnectionParams {
  position: number;
  yaw: number;
  pitch: number;
  roll: number;
}

export interface ConnectionLimits {
  positionMin: number;
  positionMax: number;
  yawMin: number;
  yawMax: number;
  pitchMin: number;
  pitchMax: number;
  rollMin: number;
  rollMax: number;
}

const DEFAULT_LIMITS: ConnectionLimits = {
  positionMin: 0, positionMax: 1,
  yawMin: -Math.PI, yawMax: Math.PI,
  pitchMin: -Math.PI, pitchMax: Math.PI,
  rollMin: -Math.PI, rollMax: Math.PI,
};

interface PageState {
  viewMode: ViewMode;
  showSpheres: boolean;
  physicsParams: PhysicsParams;
  setPhysicsParams: (params: Partial<PhysicsParams>) => void;
  bodyConnectionParams: BodyConnectionParams;
  setBodyConnectionParams: (params: Partial<BodyConnectionParams>) => void;
  bodyToBodyConnectionParams: BodyConnectionParams;
  setBodyToBodyConnectionParams: (params: Partial<BodyConnectionParams>) => void;
  bodyToTailConnectionParams: BodyConnectionParams;
  setBodyToTailConnectionParams: (params: Partial<BodyConnectionParams>) => void;
  headBodyLimits: ConnectionLimits;
  setHeadBodyLimits: (limits: Partial<ConnectionLimits>) => void;
  bodyBodyLimits: ConnectionLimits;
  setBodyBodyLimits: (limits: Partial<ConnectionLimits>) => void;
  bodyTailLimits: ConnectionLimits;
  setBodyTailLimits: (limits: Partial<ConnectionLimits>) => void;
  bodyLinkCount: number;
  addBodyLink: () => void;
  removeBodyLink: () => void;
  collisionSpheres: SphereCollection;
  frontConnection: Record<string, Sphere>;
  backConnection: Record<string, ColumnShape>;
  frontPoints: SphereCollection;
  backPoints: SphereCollection;
  setViewMode: (mode: ViewMode) => void;
  setShowSpheres: (show: boolean) => void;
  addCollisionSphere: (segmentKey: string) => void;
  updateCollisionSphere: (segmentKey: string, id: string, updates: Partial<Pick<Sphere, "position" | "radius">>) => void;
  removeCollisionSphere: (segmentKey: string, id: string) => void;
  updateFrontConnection: (segmentKey: string, updates: Partial<Pick<Sphere, "position" | "radius">>) => void;
  addBackConnection: (segmentKey: string) => void;
  updateBackConnection: (segmentKey: string, updates: Partial<ColumnShape>) => void;
  removeBackConnection: (segmentKey: string) => void;
  addFrontPoint: (segmentKey: string) => void;
  updateFrontPoint: (segmentKey: string, id: string, updates: Partial<Pick<Sphere, "position" | "radius">>) => void;
  removeFrontPoint: (segmentKey: string, id: string) => void;
  addBackPoint: (segmentKey: string) => void;
  updateBackPoint: (segmentKey: string, id: string, updates: Partial<Pick<Sphere, "position" | "radius">>) => void;
  removeBackPoint: (segmentKey: string, id: string) => void;
  liveJointValues: { headBody: BodyConnectionParams; bodyBody: BodyConnectionParams; bodyTail: BodyConnectionParams } | null;
  setLiveJointValues: (v: { headBody: BodyConnectionParams; bodyBody: BodyConnectionParams; bodyTail: BodyConnectionParams }) => void;
}

export const usePageStore = create<PageState>()(persist((set) => {
  const collisionActions = makeSphereActions("collisionSpheres", set as any);
  const frontPointActions = makeSphereActions("frontPoints", set as any);
  const backPointActions = makeSphereActions("backPoints", set as any);

  return {
    viewMode: "play",
    showSpheres: false,
    physicsParams: DEFAULT_PHYSICS_PARAMS,
    setPhysicsParams: (params) => set((state) => ({ physicsParams: { ...state.physicsParams, ...params } })),
    bodyConnectionParams: DEFAULT_BODY_CONNECTION_PARAMS,
    setBodyConnectionParams: (params) => set((state) => ({ bodyConnectionParams: { ...state.bodyConnectionParams, ...params } })),
    bodyToBodyConnectionParams: DEFAULT_BODY_TO_BODY_CONNECTION_PARAMS,
    setBodyToBodyConnectionParams: (params) => set((state) => ({ bodyToBodyConnectionParams: { ...state.bodyToBodyConnectionParams, ...params } })),
    bodyToTailConnectionParams: DEFAULT_BODY_TO_TAIL_CONNECTION_PARAMS,
    setBodyToTailConnectionParams: (params) => set((state) => ({ bodyToTailConnectionParams: { ...state.bodyToTailConnectionParams, ...params } })),
    headBodyLimits: DEFAULT_HEAD_BODY_LIMITS,
    setHeadBodyLimits: (limits) => set((state) => ({ headBodyLimits: { ...state.headBodyLimits, ...limits } })),
    bodyBodyLimits: DEFAULT_BODY_BODY_LIMITS,
    setBodyBodyLimits: (limits) => set((state) => ({ bodyBodyLimits: { ...state.bodyBodyLimits, ...limits } })),
    bodyTailLimits: DEFAULT_BODY_TAIL_LIMITS,
    setBodyTailLimits: (limits) => set((state) => ({ bodyTailLimits: { ...state.bodyTailLimits, ...limits } })),
    bodyLinkCount: 1,
    addBodyLink: () => set((state) => ({ bodyLinkCount: Math.min(50, state.bodyLinkCount + 1) })),
    removeBodyLink: () => set((state) => ({ bodyLinkCount: Math.max(1, state.bodyLinkCount - 1) })),
    collisionSpheres: INITIAL_COLLISION_SPHERES,
    frontConnection: INITIAL_FRONT_CONNECTION,
    backConnection: INITIAL_BACK_CONNECTION,
    frontPoints: INITIAL_FRONT_POINTS,
    backPoints: INITIAL_BACK_POINTS,
    setViewMode: (mode) => set({ viewMode: mode }),
    setShowSpheres: (show) => set({ showSpheres: show }),
    addCollisionSphere: collisionActions.add,
    updateCollisionSphere: collisionActions.update,
    removeCollisionSphere: collisionActions.remove,
    updateFrontConnection: (segmentKey, updates) =>
      set((state) => ({
        frontConnection: {
          ...state.frontConnection,
          [segmentKey]: { ...state.frontConnection[segmentKey], ...updates },
        },
      })),
    addBackConnection: (segmentKey) =>
      set((state) => ({
        backConnection: {
          ...state.backConnection,
          [segmentKey]: { center: [0, 0, 0], height: 0.2, radius: 0.05, curve: 0, rotationX: 0, rotationY: 0, rotationZ: 0 },
        },
      })),
    updateBackConnection: (segmentKey, updates) =>
      set((state) => ({
        backConnection: {
          ...state.backConnection,
          [segmentKey]: { ...state.backConnection[segmentKey], ...updates },
        },
      })),
    removeBackConnection: (segmentKey) =>
      set((state) => {
        const { [segmentKey]: _, ...rest } = state.backConnection;
        return { backConnection: rest };
      }),
    addFrontPoint: frontPointActions.add,
    updateFrontPoint: frontPointActions.update,
    removeFrontPoint: frontPointActions.remove,
    addBackPoint: backPointActions.add,
    updateBackPoint: backPointActions.update,
    removeBackPoint: backPointActions.remove,
    liveJointValues: null,
    setLiveJointValues: (v) => set({ liveJointValues: v }),
  };
}, {
  name: "eco3d-page-store",
  partialize: (state) => ({ physicsParams: state.physicsParams, bodyConnectionParams: state.bodyConnectionParams, bodyToBodyConnectionParams: state.bodyToBodyConnectionParams, bodyToTailConnectionParams: state.bodyToTailConnectionParams, bodyLinkCount: state.bodyLinkCount, headBodyLimits: state.headBodyLimits, bodyBodyLimits: state.bodyBodyLimits, bodyTailLimits: state.bodyTailLimits }),
  merge: (persisted, current) => ({
    ...current,
    physicsParams: {
      ...current.physicsParams,
      ...(persisted as Partial<PageState>).physicsParams,
    },
    bodyConnectionParams: {
      ...current.bodyConnectionParams,
      ...(persisted as Partial<PageState>).bodyConnectionParams,
    },
    bodyToBodyConnectionParams: {
      ...current.bodyToBodyConnectionParams,
      ...(persisted as Partial<PageState>).bodyToBodyConnectionParams,
    },
    bodyToTailConnectionParams: {
      ...current.bodyToTailConnectionParams,
      ...(persisted as Partial<PageState>).bodyToTailConnectionParams,
    },
    bodyLinkCount: (persisted as Partial<PageState>).bodyLinkCount ?? current.bodyLinkCount,
    headBodyLimits: { ...current.headBodyLimits, ...(persisted as Partial<PageState>).headBodyLimits },
    bodyBodyLimits: { ...current.bodyBodyLimits, ...(persisted as Partial<PageState>).bodyBodyLimits },
    bodyTailLimits: { ...current.bodyTailLimits, ...(persisted as Partial<PageState>).bodyTailLimits },
  }),
}));
